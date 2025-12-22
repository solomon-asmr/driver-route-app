import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  I18nManager,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, SHADOWS } from "../theme";

/* ===================== CONFIGURATION ===================== */

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
const REROUTE_THRESHOLD_METERS = 50;
const ARRIVAL_THRESHOLD_KM = 0.05;
const GPS_THROTTLE_MS = 1000;
const SCREEN_HEIGHT = Dimensions.get("window").height;

/* ===================== MATH HELPERS ===================== */

const stripHtml = (html = "") => html.replace(/<[^>]*>?/gm, "");

const decodePolyline = (t, e = 5) => {
  let n,
    o,
    u = 0,
    l = 0,
    r = 0,
    d = [],
    h = 0,
    i = 0,
    a = null,
    c = Math.pow(10, e);
  while (u < t.length) {
    a = null;
    h = 0;
    i = 0;
    do {
      a = t.charCodeAt(u++) - 63;
      i |= (31 & a) << h;
      h += 5;
    } while (a >= 32);
    n = i & 1 ? ~(i >> 1) : i >> 1;
    l += n;
    h = 0;
    i = 0;
    do {
      a = t.charCodeAt(u++) - 63;
      i |= (31 & a) << h;
      h += 5;
    } while (a >= 32);
    o = i & 1 ? ~(i >> 1) : i >> 1;
    r += o;
    d.push({ latitude: l / c, longitude: r / c });
  }
  return d;
};

const haversineKm = (a, b) => {
  if (!a || !b) return 0;
  const R = 6371;
  const dLat = (b.latitude - a.latitude) * (Math.PI / 180);
  const dLon = (b.longitude - a.longitude) * (Math.PI / 180);
  const la1 = a.latitude * (Math.PI / 180);
  const la2 = b.latitude * (Math.PI / 180);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const distToSegment = (p, v, w) => {
  const l2 = (w.latitude - v.latitude) ** 2 + (w.longitude - v.longitude) ** 2;
  if (l2 === 0) return haversineKm(p, v) * 1000;
  let t =
    ((p.latitude - v.latitude) * (w.latitude - v.latitude) +
      (p.longitude - v.longitude) * (w.longitude - v.longitude)) /
    l2;
  t = Math.max(0, Math.min(1, t));
  const projection = {
    latitude: v.latitude + t * (w.latitude - v.latitude),
    longitude: v.longitude + t * (w.longitude - v.longitude),
  };
  return haversineKm(p, projection) * 1000;
};

const isUserOffRoute = (userLoc, polylinePoints, threshold = 50) => {
  if (!userLoc || !polylinePoints || polylinePoints.length < 2) return false;
  let minDistance = Number.MAX_VALUE;
  const step = Math.max(1, Math.floor(polylinePoints.length / 50));

  for (let i = 0; i < polylinePoints.length - 1; i += step) {
    const d = distToSegment(userLoc, polylinePoints[i], polylinePoints[i + 1]);
    if (d < minDistance) minDistance = d;
  }
  return minDistance > threshold;
};

const calculateExactRemainingDistance = (
  userPos,
  polylinePoints,
  lastIndex = 0
) => {
  if (!polylinePoints || polylinePoints.length < 2)
    return { distance: 0, index: 0 };

  let minDistance = Number.MAX_VALUE;
  let closestSegmentIndex = lastIndex;

  const searchLimit = Math.min(lastIndex + 50, polylinePoints.length - 1);
  const startSearch = lastIndex;

  for (let i = startSearch; i < searchLimit; i++) {
    const p1 = polylinePoints[i];
    const p2 = polylinePoints[i + 1];

    const l2 =
      (p2.latitude - p1.latitude) ** 2 + (p2.longitude - p1.longitude) ** 2;
    let t = 0;
    if (l2 !== 0) {
      t =
        ((userPos.latitude - p1.latitude) * (p2.latitude - p1.latitude) +
          (userPos.longitude - p1.longitude) * (p2.longitude - p1.longitude)) /
        l2;
      t = Math.max(0, Math.min(1, t));
    }

    const proj = {
      latitude: p1.latitude + t * (p2.latitude - p1.latitude),
      longitude: p1.longitude + t * (p2.longitude - p1.longitude),
    };

    const distToProj = haversineKm(userPos, proj);

    if (distToProj < minDistance) {
      minDistance = distToProj;
      closestSegmentIndex = i;
    }
  }

  let remainingKm = haversineKm(
    userPos,
    polylinePoints[closestSegmentIndex + 1]
  );

  for (let i = closestSegmentIndex + 1; i < polylinePoints.length - 1; i++) {
    remainingKm += haversineKm(polylinePoints[i], polylinePoints[i + 1]);
  }

  return { distance: remainingKm, index: closestSegmentIndex };
};

const getBearing = (start, end) => {
  const startLat = (start.latitude * Math.PI) / 180;
  const startLng = (start.longitude * Math.PI) / 180;
  const endLat = (end.latitude * Math.PI) / 180;
  const endLng = (end.longitude * Math.PI) / 180;
  const y = Math.sin(endLng - startLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
};

/* ===================== MARKERS ===================== */

const CarMarker = memo(({ coordinate }) => {
  // Hack to force refresh on Android sometimes
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setTracks(false), 1000);
    return () => clearTimeout(t);
  }, []);

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={100}
      tracksViewChanges={tracks}
    >
      <Ionicons name="car-sport" size={40} color={COLORS.secondary} />
    </Marker>
  );
});

const StopMarker = memo(({ coordinate, index, visited }) => {
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    setTracks(true);
    const t = setTimeout(() => setTracks(false), 500);
    return () => clearTimeout(t);
  }, [index, visited]);

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={50}
      tracksViewChanges={tracks}
    >
      <View style={[styles.stopMarker, visited && styles.visitedMarker]}>
        {visited ? (
          <Ionicons name="checkmark" size={14} color="white" />
        ) : (
          <Text style={styles.markerNumber}>{index}</Text>
        )}
      </View>
    </Marker>
  );
});

const FlagMarker = memo(({ coordinate }) => {
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    setTimeout(() => setTracks(false), 500);
  }, []);
  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 1 }}
      zIndex={90}
      tracksViewChanges={tracks}
    >
      <View style={styles.flagMarker}>
        <Ionicons name="flag" size={18} color="white" />
      </View>
    </Marker>
  );
});

/* ===================== MAIN SCREEN ===================== */

export default function MapScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  const isRTL = i18n.language === "he" || i18n.language === "ar";
  const textAlignStyle = { textAlign: isRTL ? "right" : "left" };

  const {
    passengersToRoute = [],
    finalDestination = null,
    customStartLocation = null,
  } = route.params || {};

  /* ---------- STATE ---------- */
  const [driverLocation, setDriverLocation] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [orderedPassengers, setOrderedPassengers] = useState(passengersToRoute);

  const [remainingKm, setRemainingKm] = useState(0);
  const [remainingMin, setRemainingMin] = useState(0);
  const [nextInstruction, setNextInstruction] = useState(null);
  const [distToTurn, setDistToTurn] = useState(0);
  const [visitedIds, setVisitedIds] = useState(new Set());
  const [isRerouting, setIsRerouting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [isMapReady, setIsMapReady] = useState(false);

  /* ---------- REFS ---------- */
  const mapRef = useRef(null);
  const routeCoordsRef = useRef([]);
  const routeStepsRef = useRef([]);
  const stepIndexRef = useRef(0);
  const visitedRef = useRef(new Set());
  const avgSpeedRef = useRef(0.5); // Km per minute
  const lastGpsRef = useRef(0);
  const arrivedRef = useRef(false);
  const initialRouteFetched = useRef(false);
  const currentPolylineIndexRef = useRef(0);

  // Ref to track last camera heading to prevent jitter
  const lastHeadingRef = useRef(0);

  /* ===================== INITIALIZATION ===================== */
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("error_title"), "GPS is required.", [{ text: t("ok") }]);
        setInitialLoading(false);
        return;
      }

      let startPos = null;
      if (customStartLocation) {
        startPos = {
          latitude: customStartLocation.lat || customStartLocation.latitude,
          longitude: customStartLocation.lng || customStartLocation.longitude,
        };
      } else {
        const pos = await Location.getCurrentPositionAsync({});
        startPos = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
      }

      setDriverLocation(startPos);

      if (!initialRouteFetched.current && startPos) {
        fetchRoute(startPos);
      }
    })();
  }, []);

  /* ===================== ROUTE FETCH ===================== */
  const fetchRoute = useCallback(
    async (origin) => {
      if (isRerouting) return;
      setIsRerouting(true);
      initialRouteFetched.current = true;

      try {
        const activeStops = passengersToRoute.filter(
          (p) => !visitedRef.current.has(p.id)
        );

        const dest = finalDestination
          ? `${finalDestination.lat},${finalDestination.lng}`
          : activeStops.length > 0
          ? `${activeStops[activeStops.length - 1].lat},${
              activeStops[activeStops.length - 1].lng
            }`
          : `${origin.latitude},${origin.longitude}`;

        let waypointsStr = "";
        if (activeStops.length > 0 && finalDestination) {
          const points = activeStops.map((p) => `${p.lat},${p.lng}`).join("|");
          waypointsStr = `&waypoints=optimize:true|${points}`;
        }

        const langCode = i18n.language || "en";
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${dest}${waypointsStr}&mode=driving&language=${langCode}&key=${GOOGLE_API_KEY}`;

        const res = await fetch(url);
        const json = await res.json();

        if (json.status !== "OK") {
          console.warn("Directions API Error:", json.status);
          return;
        }

        const routeData = json.routes[0];
        const orderArray = routeData.waypoint_order || [];

        if (orderArray.length > 0) {
          const reordered = orderArray.map((index) => activeStops[index]);
          setOrderedPassengers(reordered);
        } else {
          setOrderedPassengers(activeStops);
        }

        const points = decodePolyline(routeData.overview_polyline.points);
        routeCoordsRef.current = points;
        setRouteCoords(points);
        currentPolylineIndexRef.current = 0;

        let allSteps = [];
        routeData.legs.forEach((leg) => {
          allSteps = [...allSteps, ...leg.steps];
        });
        routeStepsRef.current = allSteps;
        stepIndexRef.current = 0;

        let totalMeters = 0;
        let totalSecs = 0;
        routeData.legs.forEach((leg) => {
          totalMeters += leg.distance.value;
          totalSecs += leg.duration.value;
        });

        if (totalSecs > 0) {
          avgSpeedRef.current = totalMeters / 1000 / (totalSecs / 60);
        }

        setRemainingKm(totalMeters / 1000);
        setRemainingMin(totalSecs / 60);
      } catch (err) {
        console.error("Route Fetch Error", err);
        Alert.alert(t("error_title"), t("server_error"), [{ text: t("ok") }]);
      } finally {
        setIsRerouting(false);
        setInitialLoading(false);
      }
    },
    [passengersToRoute, finalDestination, i18n.language, isRerouting]
  );

  /* ===================== GPS TRACKING & CAMERA ===================== */
  useEffect(() => {
    if (customStartLocation) return;

    let sub;
    (async () => {
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
        (loc) => {
          const now = Date.now();
          if (now - lastGpsRef.current < GPS_THROTTLE_MS) return;
          lastGpsRef.current = now;

          const pos = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          const { heading, speed } = loc.coords;

          setDriverLocation(pos);

          // --- FIXED CAMERA ROTATION LOGIC ---
          if (mapRef.current && isMapReady) {
            // Speed threshold (approx 5 km/h)
            // If moving fast -> Trust GPS Heading
            // If stopped/slow -> Trust Route Path (Look Ahead)
            const isMoving = speed && speed > 1.5;

            let newHeading = lastHeadingRef.current; // Default to last known

            if (isMoving && heading >= 0) {
              // Trust the GPS
              newHeading = heading;
            } else if (routeCoordsRef.current.length > 1) {
              // We are stopped or GPS compass is noise.
              // Look at the "Next Point" on the route to orient correctly.
              const nextPointIndex = currentPolylineIndexRef.current + 1;
              const targetPoint =
                routeCoordsRef.current[nextPointIndex] ||
                routeCoordsRef.current[1];

              if (targetPoint) {
                newHeading = getBearing(pos, targetPoint);
              }
            }

            // Smooth Jitter: Only rotate if change > 2 degrees
            if (Math.abs(newHeading - lastHeadingRef.current) > 2) {
              lastHeadingRef.current = newHeading;

              mapRef.current.animateCamera(
                {
                  center: pos,
                  heading: newHeading,
                  pitch: 60,
                  zoom: 17,
                },
                { duration: 1000 }
              );
            } else {
              // Even if we don't rotate, we must move center to follow car
              mapRef.current.animateCamera(
                {
                  center: pos,
                  heading: lastHeadingRef.current,
                  pitch: 60,
                  zoom: 17,
                },
                { duration: 1000 }
              );
            }
          }

          /* --- LOGIC 1: INSTRUCTIONS --- */
          const steps = routeStepsRef.current;
          let idx = stepIndexRef.current;

          if (steps && steps[idx]) {
            const end = steps[idx].end_location;
            const d = haversineKm(pos, {
              latitude: end.lat,
              longitude: end.lng,
            });
            setDistToTurn((d * 1000).toFixed(0));

            if (d < 0.02 && idx + 1 < steps.length) {
              stepIndexRef.current++;
              idx++;
            }

            if (steps[idx]) {
              const instr =
                steps[Math.min(idx + 1, steps.length - 1)]?.html_instructions ||
                "";
              setNextInstruction(stripHtml(instr));
            }
          }

          /* --- LOGIC 2: OFF-ROUTE --- */
          if (routeCoordsRef.current.length > 0 && !isRerouting) {
            const isOff = isUserOffRoute(
              pos,
              routeCoordsRef.current,
              REROUTE_THRESHOLD_METERS
            );
            if (isOff) fetchRoute(pos);
          }

          /* --- LOGIC 3: SMOOTH REMAINING DISTANCE --- */
          if (routeCoordsRef.current.length > 0) {
            const { distance, index } = calculateExactRemainingDistance(
              pos,
              routeCoordsRef.current,
              currentPolylineIndexRef.current
            );
            currentPolylineIndexRef.current = index;
            setRemainingKm(distance);
            if (avgSpeedRef.current > 0) {
              setRemainingMin(distance / avgSpeedRef.current);
            }
          }

          /* --- LOGIC 4: CHECK ARRIVALS --- */
          passengersToRoute.forEach((p) => {
            if (!visitedRef.current.has(p.id)) {
              const d = haversineKm(pos, { latitude: p.lat, longitude: p.lng });
              if (d < ARRIVAL_THRESHOLD_KM) {
                visitedRef.current.add(p.id);
                setVisitedIds(new Set(visitedRef.current));
                fetchRoute(pos);
              }
            }
          });

          /* --- LOGIC 5: FINAL DESTINATION --- */
          if (finalDestination && !arrivedRef.current) {
            const d = haversineKm(pos, {
              latitude: finalDestination.lat,
              longitude: finalDestination.lng,
            });
            if (d < ARRIVAL_THRESHOLD_KM) {
              arrivedRef.current = true;
              setRemainingKm(0);
              setRemainingMin(0);
              Alert.alert(
                t("map_destination_reached_title"),
                t("map_destination_reached_msg"),
                [{ text: t("ok") }]
              );
            }
          }
        }
      );
    })();

    return () => sub?.remove();
  }, [fetchRoute, isRerouting, customStartLocation, isMapReady]);

  /* ===================== RENDER ===================== */

  const headerHeight = insets.top + 60;

  // --- CAMERA PADDING TRICK ---
  // Large TOP padding pushes the visual "Center" (the car) DOWN.
  const mapPadding = {
    top: SCREEN_HEIGHT * 0.55, // Center is at bottom 45% of screen
    right: 10,
    bottom: 240, // Keeps space for Dashboard
    left: 10,
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="white"
        translucent={false}
      />

      {/* HEADER */}
      <View
        style={[
          styles.headerContainer,
          { height: headerHeight, paddingTop: insets.top },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={COLORS.textMain}
            style={{
              transform: [{ scaleX: isRTL || I18nManager.isRTL ? -1 : 1 }],
            }}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("map_active_route")}</Text>
      </View>

      {/* LOADING */}
      {initialLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: 10, color: COLORS.textSub }}>
            {t("map_recalculating")}
          </Text>
        </View>
      )}

      {/* NAV BANNER */}
      {!initialLoading && nextInstruction && (
        <View style={[styles.navBanner, { top: headerHeight }]}>
          <Ionicons
            name="return-up-forward"
            size={32}
            color="white"
            style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
          />
          <View style={{ marginStart: 15, flex: 1 }}>
            <Text style={[styles.navDistText, textAlignStyle]}>
              {distToTurn > 20
                ? t("map_in_meters", { distance: distToTurn })
                : t("map_turn_now")}
            </Text>
            <Text
              style={[styles.navInstructionText, textAlignStyle]}
              numberOfLines={2}
            >
              {nextInstruction}
            </Text>
          </View>
        </View>
      )}

      {/* MAP */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={false}
        showsCompass={false}
        mapPadding={mapPadding}
        onMapReady={() => setIsMapReady(true)}
        initialRegion={
          driverLocation
            ? { ...driverLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 }
            : undefined
        }
      >
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeWidth={5}
            strokeColor={COLORS.primary}
            zIndex={1}
          />
        )}

        {driverLocation && <CarMarker coordinate={driverLocation} />}

        {orderedPassengers.map((p, index) => (
          <StopMarker
            key={p.id}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            index={index + 1}
            visited={visitedIds.has(p.id)}
          />
        ))}

        {finalDestination && (
          <FlagMarker
            coordinate={{
              latitude: finalDestination.lat,
              longitude: finalDestination.lng,
            }}
          />
        )}
      </MapView>

      {/* DASHBOARD */}
      <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.tripInfo}>
          <View style={styles.statItem}>
            <Text style={styles.tripValue}>{remainingKm.toFixed(1)} km</Text>
            <Text style={styles.tripLabel}>{t("map_remaining")}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.tripValue}>{Math.ceil(remainingMin)} min</Text>
            <Text style={styles.tripLabel}>{t("map_eta")}</Text>
          </View>
        </View>
        {isRerouting && !initialLoading && (
          <Text style={styles.reroutingText}>{t("map_recalculating")}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  map: { flex: 1 },

  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 1000,
    ...SHADOWS.small,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 15,
    color: COLORS.textMain,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
  },

  navBanner: {
    position: "absolute",
    left: 10,
    right: 10,
    backgroundColor: "#1b5e20",
    borderRadius: 10,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  navDistText: { color: "#a5d6a7", fontWeight: "bold" },
  navInstructionText: { color: "white", fontSize: 18, fontWeight: "bold" },

  stopMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.danger,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 1 },
  },
  visitedMarker: { backgroundColor: COLORS.secondary },

  markerNumber: {
    color: "white",
    fontWeight: "bold",
    fontSize: 12,
    textAlign: "center",
  },

  flagMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },

  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    elevation: 20,
    ...SHADOWS.medium,
  },
  tripInfo: { flexDirection: "row", justifyContent: "space-between" },
  statItem: { alignItems: "center", flex: 1 },
  tripValue: { fontSize: 24, fontWeight: "800", color: COLORS.textMain },
  tripLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textSub,
    marginTop: 4,
  },
  divider: { width: 1, height: 40, backgroundColor: COLORS.border },
  reroutingText: {
    textAlign: "center",
    color: COLORS.primary,
    fontWeight: "bold",
    marginTop: 10,
  },
});
