import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
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

/* ===================== CONFIG ===================== */

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
const REROUTE_THRESHOLD_METERS = 50;
const ARRIVAL_THRESHOLD_KM = 0.05; // 50 meters
const GPS_THROTTLE_MS = 1000; // Update UI max once per second

/* ===================== HELPERS ===================== */

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

/* ===================== OPTIMIZED MARKERS ===================== */

// Use memo to prevent re-renders unless props change
const StableMarker = memo(({ children, ...props }) => {
  const [tracksViewChanges, setTracks] = useState(true);

  // Stop tracking view changes after 500ms to save CPU
  useEffect(() => {
    const t = setTimeout(() => setTracks(false), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <Marker {...props} tracksViewChanges={tracksViewChanges}>
      {children}
    </Marker>
  );
});

const CarMarker = memo(({ coordinate }) => (
  <StableMarker
    coordinate={coordinate}
    anchor={{ x: 0.5, y: 0.5 }}
    zIndex={100}
  >
    <Ionicons name="car-sport" size={40} color={COLORS.secondary} />
  </StableMarker>
));

const StopMarker = memo(({ p, visited }) => (
  <StableMarker
    coordinate={{ latitude: p.lat, longitude: p.lng }}
    anchor={{ x: 0.5, y: 0.5 }}
    zIndex={50}
  >
    <View style={[styles.stopMarker, visited && styles.visitedMarker]}>
      {visited ? (
        <Ionicons name="checkmark" size={14} color="white" />
      ) : (
        <View style={styles.innerDot} />
      )}
    </View>
  </StableMarker>
));

const FlagMarker = memo(({ coordinate }) => (
  <StableMarker coordinate={coordinate} anchor={{ x: 0.5, y: 1.0 }} zIndex={90}>
    <View style={styles.flagMarker}>
      <Ionicons name="flag" size={18} color="white" />
    </View>
  </StableMarker>
));

/* ===================== MAIN SCREEN ===================== */

export default function MapScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  // CHECK: Is the active language Hebrew OR Arabic?
  const isRTL = i18n.language === "he" || i18n.language === "ar";

  // Instant Text Alignment
  const textAlignStyle = { textAlign: isRTL ? "right" : "left" };

  const { passengersToRoute = [], finalDestination = null } =
    route.params || {};

  /* ---------- STATE ---------- */
  const [driverLocation, setDriverLocation] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [remainingKm, setRemainingKm] = useState(0);
  const [remainingMin, setRemainingMin] = useState(0);
  const [nextInstruction, setNextInstruction] = useState(null);
  const [distToTurn, setDistToTurn] = useState(0);
  const [visitedIds, setVisitedIds] = useState(new Set());
  const [isRerouting, setIsRerouting] = useState(false);

  /* ---------- REFS ---------- */
  const mapRef = useRef(null);
  const routeCoordsRef = useRef([]); // Keep ref for fast access in loop
  const routeStepsRef = useRef([]);
  const stepIndexRef = useRef(0);
  const visitedRef = useRef(new Set());
  const avgSpeedRef = useRef(0.5); // Default ~30km/h
  const lastGpsRef = useRef(0);
  const arrivedRef = useRef(false);

  /* ===================== INITIAL PERMISSIONS ===================== */
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("error_title"), "GPS is required.", [{ text: t("ok") }]);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({});
      const initialPos = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setDriverLocation(initialPos);
    })();
  }, []);

  /* ===================== ROUTING LOGIC ===================== */
  const fetchRoute = useCallback(
    async (origin) => {
      if (isRerouting) return;
      setIsRerouting(true);

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
        const points = decodePolyline(routeData.overview_polyline.points);

        // Update Refs
        routeCoordsRef.current = points;
        setRouteCoords(points); // Trigger re-render for Polyline

        let allSteps = [];
        routeData.legs.forEach((leg) => {
          allSteps = [...allSteps, ...leg.steps];
        });
        routeStepsRef.current = allSteps;
        stepIndexRef.current = 0;

        // Calc Stats
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

        // Fit Map
        mapRef.current?.fitToCoordinates(points, {
          edgePadding: { top: 120, bottom: 260, left: 40, right: 40 },
          animated: true,
        });
      } catch (err) {
        console.error("Route Fetch Error", err);
      } finally {
        setIsRerouting(false);
      }
    },
    [passengersToRoute, finalDestination, i18n.language, isRerouting]
  );

  /* ===================== TRIGGER INITIAL ROUTE ===================== */
  useEffect(() => {
    if (driverLocation && routeCoordsRef.current.length === 0) {
      fetchRoute(driverLocation);
    }
  }, [driverLocation, fetchRoute]);

  /* ===================== GPS TRACKING LOOP ===================== */
  useEffect(() => {
    let sub;
    (async () => {
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
        (loc) => {
          const now = Date.now();
          // Throttle updates to avoid state thrashing
          if (now - lastGpsRef.current < GPS_THROTTLE_MS) return;
          lastGpsRef.current = now;

          const pos = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          const { heading, speed } = loc.coords;

          setDriverLocation(pos);

          // Animate Camera (Smooth Driver View)
          if (mapRef.current && heading >= 0 && speed > 0.5) {
            mapRef.current.animateCamera(
              {
                center: pos,
                heading: heading,
                pitch: 50,
                zoom: 18,
              },
              { duration: 1000 }
            );
          }

          // 1. Navigation Instructions
          const steps = routeStepsRef.current;
          let idx = stepIndexRef.current;

          if (steps && steps[idx]) {
            const end = steps[idx].end_location;
            const d = haversineKm(pos, {
              latitude: end.lat,
              longitude: end.lng,
            });
            setDistToTurn((d * 1000).toFixed(0));

            // Advance step if close
            if (d < 0.02 && idx + 1 < steps.length) {
              stepIndexRef.current++;
              idx++;
            }

            // Show instruction
            if (steps[idx]) {
              // Look ahead 1 step for "Next Turn" usually, or current if close
              const instr =
                steps[Math.min(idx + 1, steps.length - 1)]?.html_instructions ||
                "";
              setNextInstruction(stripHtml(instr));
            }
          }

          // 2. Remaining Distance/Time (Pure Math, no API call)
          if (routeCoordsRef.current.length > 0) {
            // Find closest point on polyline roughly
            // (Simplified: Just subtract distance travelled based on speed is complex,
            //  so we stick to haversine from current pos to end of polyline roughly)
            //  For high perf, we trust the 'remainingKm' decremented by distance moved?
            //  Better: Re-calculate from array.
            // Simple fallback: Decrement based on moved distance? No, drift occurs.
            // We will skip heavy array reduction every second.
            // Just let the stats update on Reroute or significant event.
            // OR: A quick hack: direct distance to destination * 1.3 (road factor)
          }

          // 3. Check Stop Arrivals
          passengersToRoute.forEach((p) => {
            if (!visitedRef.current.has(p.id)) {
              const d = haversineKm(pos, { latitude: p.lat, longitude: p.lng });
              if (d < 0.05) {
                // 50 meters
                visitedRef.current.add(p.id);
                setVisitedIds(new Set(visitedRef.current));
                fetchRoute(pos); // Recalculate removing this stop
              }
            }
          });

          // 4. Check Final Destination
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
  }, [fetchRoute]);

  /* ===================== RENDER ===================== */

  const headerHeight = insets.top + 60;
  const mapPadding = {
    top: headerHeight + 20,
    right: 10,
    bottom: 240, // Space for bottom sheet
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
            // Instant RTL Flip
            style={{
              transform: [{ scaleX: isRTL || I18nManager.isRTL ? -1 : 1 }],
            }}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("map_active_route")}</Text>
      </View>

      {/* NAV BANNER */}
      {nextInstruction && (
        <View style={[styles.navBanner, { top: headerHeight }]}>
          <Ionicons
            name="return-up-forward"
            size={32}
            color="white"
            // Flip nav arrow icon if RTL
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
        showsUserLocation={false} // We draw our own car
        showsCompass={true}
        mapPadding={mapPadding}
        initialRegion={
          driverLocation
            ? {
                ...driverLocation,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }
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

        {passengersToRoute.map((p) => (
          <StopMarker key={p.id} p={p} visited={visitedIds.has(p.id)} />
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

      {/* DASHBOARD (Restored!) */}
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
        {isRerouting && (
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

  // Markers
  stopMarker: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.danger,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  visitedMarker: { backgroundColor: COLORS.secondary },
  innerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "white" },
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

  // Bottom Sheet
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
