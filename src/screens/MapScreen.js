import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { memo, useEffect, useRef, useState } from "react";
import {
  Alert,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, SHADOWS } from "../theme";

// --- CONFIGURATION ---
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
const REROUTE_THRESHOLD_METERS = 50;
const ARRIVAL_THRESHOLD_KM = 0.05; // 50 meters

// --- HELPER: STRIP HTML TAGS ---
// Google sends instructions like "Turn <b>Left</b>". We need just "Turn Left".
const stripHtml = (html) => {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, "");
};

// --- HELPER MATH FUNCTIONS ---
const decodePolyline = (t, e) => {
  let n,
    o,
    u = 0,
    l = 0,
    r = 0,
    d = [],
    h = 0,
    i = 0,
    a = null,
    c = Math.pow(10, e || 5);
  for (; u < t.length; ) {
    (a = null), (h = 0), (i = 0);
    do {
      (a = t.charCodeAt(u++) - 63), (i |= (31 & a) << h), (h += 5);
    } while (a >= 32);
    (n = 1 & i ? ~(i >> 1) : i >> 1), (l += n);
    (h = 0), (i = 0);
    do {
      (a = t.charCodeAt(u++) - 63), (i |= (31 & a) << h), (h += 5);
    } while (a >= 32);
    (o = 1 & i ? ~(i >> 1) : i >> 1), (r += o);
    d.push({ latitude: l / c, longitude: r / c });
  }
  return d;
};

const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const distToSegment = (p, v, w) => {
  const l2 = (w.latitude - v.latitude) ** 2 + (w.longitude - v.longitude) ** 2;
  if (l2 === 0)
    return (
      getDistanceFromLatLonInKm(
        p.latitude,
        p.longitude,
        v.latitude,
        v.longitude
      ) * 1000
    );
  let t =
    ((p.latitude - v.latitude) * (w.latitude - v.latitude) +
      (p.longitude - v.longitude) * (w.longitude - v.longitude)) /
    l2;
  t = Math.max(0, Math.min(1, t));
  const projection = {
    latitude: v.latitude + t * (w.latitude - v.latitude),
    longitude: v.longitude + t * (w.longitude - v.longitude),
  };
  return (
    getDistanceFromLatLonInKm(
      p.latitude,
      p.longitude,
      projection.latitude,
      projection.longitude
    ) * 1000
  );
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

const calculateRemainingPolylineDist = (userPos, polylinePoints) => {
  if (!polylinePoints || polylinePoints.length < 2) return 0;
  let minIdx = 0;
  let minDistance = Number.MAX_VALUE;
  for (let i = 0; i < polylinePoints.length; i += 5) {
    const d = getDistanceFromLatLonInKm(
      userPos.latitude,
      userPos.longitude,
      polylinePoints[i].latitude,
      polylinePoints[i].longitude
    );
    if (d < minDistance) {
      minDistance = d;
      minIdx = i;
    }
  }
  let remainingKm = 0;
  for (let i = minIdx; i < polylinePoints.length - 1; i++) {
    remainingKm += getDistanceFromLatLonInKm(
      polylinePoints[i].latitude,
      polylinePoints[i].longitude,
      polylinePoints[i + 1].latitude,
      polylinePoints[i + 1].longitude
    );
  }
  return remainingKm;
};

// --- MARKER COMPONENTS ---
const CarMarker = memo(({ coordinate }) => {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  useEffect(() => {
    setTracksViewChanges(true);
    const timer = setTimeout(() => setTracksViewChanges(false), 500);
    return () => clearTimeout(timer);
  }, [coordinate]);
  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
      zIndex={100}
    >
      <Ionicons name="car-sport" size={40} color={COLORS.secondary} />
    </Marker>
  );
});

const FlagMarker = memo(({ coordinate }) => {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  useEffect(() => {
    setTracksViewChanges(true);
    const timer = setTimeout(() => setTracksViewChanges(false), 500);
    return () => clearTimeout(timer);
  }, []);
  return (
    <Marker
      coordinate={coordinate}
      title="Final Destination"
      tracksViewChanges={tracksViewChanges}
      zIndex={90}
      anchor={{ x: 0.5, y: 1.0 }}
    >
      <View style={styles.flagMarker}>
        <Ionicons name="flag" size={18} color="white" />
      </View>
    </Marker>
  );
});

const StopMarker = memo(({ p, isVisited }) => {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  useEffect(() => {
    setTracksViewChanges(true);
    const timer = setTimeout(() => setTracksViewChanges(false), 500);
    return () => clearTimeout(timer);
  }, [isVisited]);
  return (
    <Marker
      coordinate={{ latitude: p.lat, longitude: p.lng }}
      title={p.name}
      tracksViewChanges={tracksViewChanges}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={50}
    >
      <View style={[styles.stopMarker, isVisited && styles.visitedMarker]}>
        {isVisited ? (
          <Ionicons name="checkmark" size={14} color="white" />
        ) : (
          <View style={styles.innerDot} />
        )}
      </View>
    </Marker>
  );
});

export default function MapScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);

  const { passengersToRoute, finalDestination } = route.params || {
    passengersToRoute: [],
    finalDestination: null,
  };

  // --- STATE ---
  const [driverLocation, setDriverLocation] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [remainingDistKm, setRemainingDistKm] = useState(0);
  const [remainingTimeMins, setRemainingTimeMins] = useState(0);
  const [isRerouting, setIsRerouting] = useState(false);
  const [visitedIds, setVisitedIds] = useState(new Set());

  // NEW: Navigation State
  const [nextManeuver, setNextManeuver] = useState(null); // e.g. "Turn Left"
  const [distToManeuver, setDistToManeuver] = useState(0); // e.g. "200" (meters)

  // --- REFS ---
  const visitedIdsRef = useRef(new Set());
  const currentRouteCoords = useRef([]);
  const routeSteps = useRef([]); // Stores the turn-by-turn steps
  const hasArrivedRef = useRef(false);
  const averageSpeedKmPerMin = useRef(0.5);

  // 1. INITIAL LOAD
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "GPS is required.");
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      const startPos = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setDriverLocation(startPos);
      // Fetch initial route AND zoom out to show it
      fetchRoute(startPos, passengersToRoute, true);
    })();
  }, []);

  // 2. FETCH ROUTE LOGIC
  const fetchRoute = async (startLoc, waypoints, moveCamera = false) => {
    if (isRerouting) return;
    setIsRerouting(true);
    setNextManeuver(null); // Clear old instructions while rerouting

    try {
      const activeWaypoints = waypoints.filter(
        (p) => !visitedIdsRef.current.has(p.id)
      );
      const originStr = `${startLoc.latitude},${startLoc.longitude}`;
      const destStr = finalDestination
        ? `${finalDestination.lat},${finalDestination.lng}`
        : activeWaypoints.length > 0
        ? `${activeWaypoints[activeWaypoints.length - 1].lat},${
            activeWaypoints[activeWaypoints.length - 1].lng
          }`
        : originStr;

      let waypointsStr = "";
      if (activeWaypoints.length > 0 && finalDestination) {
        const points = activeWaypoints
          .map((p) => `${p.lat},${p.lng}`)
          .join("|");
        waypointsStr = `&waypoints=optimize:true|${points}`;
      }

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destStr}${waypointsStr}&mode=driving&key=${GOOGLE_API_KEY}`;
      const resp = await fetch(url);
      const data = await resp.json();

      if (data.status === "OK") {
        const routeData = data.routes[0];

        // A. Visual Route Line
        const points = decodePolyline(routeData.overview_polyline.points);
        setRouteCoords(points);
        currentRouteCoords.current = points;

        // B. Turn-by-Turn Steps (Flatten all legs into one list)
        let allSteps = [];
        routeData.legs.forEach((leg) => {
          allSteps = [...allSteps, ...leg.steps];
        });
        routeSteps.current = allSteps;

        // C. Calculate Trip Totals
        let totalDistMeters = 0;
        let totalDurationSecs = 0;
        routeData.legs.forEach((leg) => {
          totalDistMeters += leg.distance.value;
          totalDurationSecs += leg.duration.value;
        });

        if (totalDurationSecs > 0) {
          averageSpeedKmPerMin.current =
            totalDistMeters / 1000 / (totalDurationSecs / 60);
        }
        setRemainingDistKm(totalDistMeters / 1000);
        setRemainingTimeMins(totalDurationSecs / 60);

        // D. Initial Camera Move (Only if requested)
        if (moveCamera && mapRef.current) {
          mapRef.current.fitToCoordinates(points, {
            edgePadding: { top: 100, right: 50, bottom: 250, left: 50 },
            animated: true,
          });
        }
      }
    } catch (error) {
      console.error("Route Error:", error);
    } finally {
      setIsRerouting(false);
    }
  };

  // 3. LIVE NAVIGATION LOOP
  useEffect(() => {
    let sub = null;
    const startWatching = async () => {
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
        (loc) => {
          const userPos = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          const { heading, speed } = loc.coords;

          setDriverLocation(userPos);

          // A. Waze-Style Camera Logic
          // Only animate if speed > 0.5 m/s (~2 km/h) to prevent spinning when stopped
          if (mapRef.current && heading >= 0 && speed > 0.5) {
            mapRef.current.animateCamera(
              {
                center: userPos,
                heading: heading, // Rotate map to match car
                pitch: 50, // 3D Tilt
                zoom: 18, // Zoom Level
              },
              { duration: 1000 }
            );
          }

          // B. "Next Turn" Logic
          if (routeSteps.current.length > 0) {
            // Find the closest Step End Point to know where we are
            let activeStepIndex = -1;
            let minDist = Number.MAX_VALUE;

            for (let i = 0; i < routeSteps.current.length; i++) {
              const stepEnd = routeSteps.current[i].end_location;
              const d = getDistanceFromLatLonInKm(
                userPos.latitude,
                userPos.longitude,
                stepEnd.lat,
                stepEnd.lng
              );
              // We assume we are on the step that ends closest to us
              if (d < minDist) {
                minDist = d;
                activeStepIndex = i;
              }
            }

            // If we found our current segment, show info for the NEXT one
            if (activeStepIndex !== -1) {
              // Distance to the end of CURRENT segment (The Turn)
              const currentStepEnd =
                routeSteps.current[activeStepIndex].end_location;
              const distToTurnKm = getDistanceFromLatLonInKm(
                userPos.latitude,
                userPos.longitude,
                currentStepEnd.lat,
                currentStepEnd.lng
              );

              setDistToManeuver((distToTurnKm * 1000).toFixed(0)); // Convert to meters

              // If there is a next step, show its instruction (e.g., "Turn Left")
              if (activeStepIndex + 1 < routeSteps.current.length) {
                setNextManeuver(
                  stripHtml(
                    routeSteps.current[activeStepIndex + 1].html_instructions
                  )
                );
              } else {
                // No next step? We are finishing the last leg.
                setNextManeuver("Arriving at Destination");
              }
            }
          }

          // C. Update Dashboard Stats (Distance/Time)
          if (currentRouteCoords.current.length > 0) {
            const distLeft = calculateRemainingPolylineDist(
              userPos,
              currentRouteCoords.current
            );
            setRemainingDistKm(distLeft);
            if (averageSpeedKmPerMin.current > 0) {
              setRemainingTimeMins(distLeft / averageSpeedKmPerMin.current);
            }
          }

          // D. Check Passenger Stops
          passengersToRoute.forEach((p) => {
            if (!visitedIdsRef.current.has(p.id)) {
              const dist = getDistanceFromLatLonInKm(
                userPos.latitude,
                userPos.longitude,
                p.lat,
                p.lng
              );
              if (dist < 0.05) {
                visitedIdsRef.current.add(p.id);
                setVisitedIds(new Set(visitedIdsRef.current));
                // Silent Re-route (moveCamera = false)
                fetchRoute(userPos, passengersToRoute, false);
              }
            }
          });

          // E. Check Final Destination
          if (finalDestination && !hasArrivedRef.current) {
            const distToFinal = getDistanceFromLatLonInKm(
              userPos.latitude,
              userPos.longitude,
              finalDestination.lat,
              finalDestination.lng
            );
            if (distToFinal < ARRIVAL_THRESHOLD_KM) {
              hasArrivedRef.current = true;
              setRemainingDistKm(0);
              setRemainingTimeMins(0);
              Alert.alert("🎉 Destination Reached! 🎉", "You have arrived.");
            }
          }

          // F. Off-Route Check
          if (currentRouteCoords.current.length > 0) {
            const isOff = isUserOffRoute(
              userPos,
              currentRouteCoords.current,
              REROUTE_THRESHOLD_METERS
            );
            if (isOff && !isRerouting) {
              // Silent Re-route (moveCamera = false)
              fetchRoute(userPos, passengersToRoute, false);
            }
          }
        }
      );
    };
    startWatching();
    return () => {
      if (sub) sub.remove();
    };
  }, []);

  // --- UI SIZING ---
  const headerHeight = insets.top + 60;

  // Extra top padding ensures Compass & Google Logo don't hide behind the green banner
  const mapPadding = {
    top: headerHeight + 120,
    right: 10,
    bottom: 240,
    left: 10,
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="white"
        translucent={false}
      />

      {/* 1. HEADER */}
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
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Active Route</Text>
      </View>

      {/* 2. NAVIGATION BANNER (Green Box) */}
      {nextManeuver && (
        <View style={[styles.navBanner, { top: headerHeight }]}>
          <View style={styles.navIconBox}>
            <Ionicons name="return-up-forward" size={32} color="white" />
          </View>
          <View style={styles.navTextBox}>
            <Text style={styles.navDistText}>
              {distToManeuver > 20 ? `In ${distToManeuver}m` : "Turn Now"}
            </Text>
            <Text style={styles.navInstructionText} numberOfLines={2}>
              {nextManeuver}
            </Text>
          </View>
        </View>
      )}

      {/* 3. MAP VIEW */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={false}
        showsCompass={true}
        initialRegion={
          driverLocation
            ? { ...driverLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 }
            : null
        }
        mapPadding={mapPadding}
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
          <StopMarker key={p.id} p={p} isVisited={visitedIds.has(p.id)} />
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

      {/* 4. BOTTOM DASHBOARD */}
      <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.tripInfo}>
          <View style={styles.statItem}>
            <Text style={styles.tripValue}>
              {remainingDistKm.toFixed(1)} km
            </Text>
            <Text style={styles.tripLabel}>REMAINING</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.tripValue}>
              {Math.ceil(remainingTimeMins)} min
            </Text>
            <Text style={styles.tripLabel}>ETA</Text>
          </View>
        </View>
        {isRerouting && (
          <Text style={styles.reroutingText}>Recalculating Route...</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    zIndex: 999,
    ...SHADOWS.small,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textMain,
    marginLeft: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
  },

  // NEW STYLES: NAVIGATION BANNER
  navBanner: {
    position: "absolute",
    left: 10,
    right: 10,
    backgroundColor: "#1b5e20", // Dark Green
    borderRadius: 10,
    flexDirection: "row",
    padding: 15,
    zIndex: 998,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    alignItems: "center",
  },
  navIconBox: { marginRight: 15 },
  navTextBox: { flex: 1 },
  navDistText: {
    color: "#a5d6a7",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 2,
  },
  navInstructionText: { color: "white", fontSize: 18, fontWeight: "bold" },

  map: { width: "100%", height: "100%" },

  stopMarker: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.danger,
    borderWidth: 2,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  visitedMarker: { backgroundColor: COLORS.secondary },
  innerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "white" },
  flagMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "black",
    borderWidth: 2,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
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
