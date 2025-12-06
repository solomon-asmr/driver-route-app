import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { COLORS, SHADOWS } from "../theme";

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

const DEFAULT_LOCATION = {
  latitude: 32.0853,
  longitude: 34.7818,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// HELPER: Haversine Formula for accurate distance (km)
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = deg2rad(lat2 - lat1);
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

export default function MapScreen({ navigation, route }) {
  const { passengersToRoute, finalDestination } = route.params || {
    passengersToRoute: [],
    finalDestination: null,
  };

  const [driverLocation, setDriverLocation] = useState(null);
  const [routeOrigin, setRouteOrigin] = useState(null);
  const [optimizedOrder, setOptimizedOrder] = useState([]);
  const [routeStats, setRouteStats] = useState({ distance: 0, duration: 0 });
  const [visitedIds, setVisitedIds] = useState(new Set());

  const mapRef = useRef(null);

  useEffect(() => {
    let locationSubscription = null;

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Cannot track location.");
        setDriverLocation(DEFAULT_LOCATION);
        setRouteOrigin(DEFAULT_LOCATION);
        return;
      }

      let currentLoc = await Location.getCurrentPositionAsync({});
      const initialPos = {
        latitude: currentLoc.coords.latitude,
        longitude: currentLoc.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setDriverLocation(initialPos);
      setRouteOrigin(initialPos);

      // Live Tracking
      locationSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10 },
        (newLoc) => {
          const lat = newLoc.coords.latitude;
          const lng = newLoc.coords.longitude;

          setDriverLocation({
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });

          // Geofencing Check (50 meters)
          passengersToRoute.forEach((p) => {
            const distanceKm = getDistanceFromLatLonInKm(
              lat,
              lng,
              p.lat,
              p.lng
            );
            if (distanceKm < 0.05) {
              setVisitedIds((prev) => {
                const newSet = new Set(prev);
                if (!newSet.has(p.id)) newSet.add(p.id);
                return newSet;
              });
            }
          });
        }
      );
    })();

    return () => {
      if (locationSubscription) locationSubscription.remove();
    };
  }, []);

  const recenterMap = () => {
    if (driverLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          ...driverLocation,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        },
        1000
      );
    }
  };

  if (!driverLocation || !routeOrigin) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Acquiring GPS Signal...</Text>
      </View>
    );
  }

  const mapWaypoints = passengersToRoute.map((p) => ({
    latitude: p.lat,
    longitude: p.lng,
  }));
  let mapDestination = finalDestination
    ? { latitude: finalDestination.lat, longitude: finalDestination.lng }
    : mapWaypoints.length > 0
    ? mapWaypoints.pop()
    : routeOrigin;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={driverLocation}
        showsUserLocation={false}
        showsCompass={false}
        showsMyLocationButton={false}
        mapPadding={{ top: 20, right: 0, bottom: 180, left: 0 }}
      >
        {/* DRIVER CAR */}
        <Marker coordinate={driverLocation} anchor={{ x: 0.5, y: 0.5 }}>
          <Ionicons name="car-sport" size={40} color={COLORS.secondary} />
        </Marker>

        {/* PASSENGERS (Dynamic Color Logic) */}
        {passengersToRoute.map((p, index) => {
          const isVisited = visitedIds.has(p.id);
          return (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.lat, longitude: p.lng }}
              title={p.name}
            >
              <View
                style={[
                  styles.stopMarker,
                  isVisited ? styles.visitedMarker : null,
                ]}
              >
                {isVisited ? (
                  <Ionicons name="checkmark" size={16} color="white" />
                ) : (
                  <View style={styles.innerDot} />
                )}
              </View>
            </Marker>
          );
        })}

        {/* DESTINATION */}
        {finalDestination && (
          <Marker coordinate={mapDestination} title="Final Destination">
            <View style={styles.destMarker}>
              <Ionicons name="flag" size={16} color="white" />
            </View>
          </Marker>
        )}

        <MapViewDirections
          origin={routeOrigin}
          destination={mapDestination}
          waypoints={mapWaypoints}
          apikey={GOOGLE_API_KEY}
          strokeWidth={5}
          strokeColor={COLORS.primary}
          optimizeWaypoints={true}
          onReady={(result) => {
            setOptimizedOrder(result.waypointOrder);
            setRouteStats({
              distance: result.distance,
              duration: result.duration,
            });
            mapRef.current.fitToCoordinates(result.coordinates, {
              edgePadding: {
                top: Platform.OS === "android" ? 120 : 80,
                right: 50,
                bottom: 200,
                left: 50,
              },
            });
          }}
        />
      </MapView>

      <SafeAreaView style={styles.safeAreaOverlay} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
      </SafeAreaView>

      <TouchableOpacity style={styles.recenterButton} onPress={recenterMap}>
        <Ionicons name="locate" size={28} color={COLORS.primary} />
      </TouchableOpacity>

      {/* DRIVER DASHBOARD (Clean Trip Monitor) */}
      <View style={styles.bottomSheet}>
        <Text style={styles.dashboardTitle}>TRIP DASHBOARD</Text>

        <View style={styles.tripInfo}>
          <View style={styles.statItem}>
            <Ionicons
              name="speedometer-outline"
              size={20}
              color={COLORS.textSub}
              style={{ marginBottom: 5 }}
            />
            <Text style={styles.tripValue}>
              {routeStats.distance.toFixed(1)} km
            </Text>
            <Text style={styles.tripLabel}>DISTANCE</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statItem}>
            <Ionicons
              name="time-outline"
              size={20}
              color={COLORS.textSub}
              style={{ marginBottom: 5 }}
            />
            <Text style={styles.tripValue}>
              {Math.round(routeStats.duration)} min
            </Text>
            <Text style={styles.tripLabel}>EST. TIME</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statItem}>
            <Ionicons
              name="people-outline"
              size={20}
              color={COLORS.textSub}
              style={{ marginBottom: 5 }}
            />
            <Text style={styles.tripValue}>
              <Text style={{ color: COLORS.secondary }}>{visitedIds.size}</Text>{" "}
              / {passengersToRoute.length}
            </Text>
            <Text style={styles.tripLabel}>COMPLETED</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  map: { width: "100%", height: "100%" },

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: COLORS.textSub, fontWeight: "600" },

  stopMarker: {
    backgroundColor: COLORS.danger,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
    ...SHADOWS.small,
  },
  visitedMarker: {
    backgroundColor: COLORS.secondary,
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  innerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "white",
  },
  destMarker: {
    backgroundColor: COLORS.textMain,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
    ...SHADOWS.small,
  },

  safeAreaOverlay: { position: "absolute", top: 0, left: 0, right: 0 },
  backButton: {
    marginLeft: 20,
    marginTop: Platform.OS === "android" ? 40 : 10,
    backgroundColor: "white",
    padding: 12,
    borderRadius: 12,
    width: 50,
    alignItems: "center",
    ...SHADOWS.medium,
  },
  recenterButton: {
    position: "absolute",
    bottom: 180,
    right: 20,
    backgroundColor: "white",
    padding: 12,
    borderRadius: 25,
    ...SHADOWS.medium,
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
    paddingBottom: 40,
    ...SHADOWS.medium,
    elevation: 20,
  },

  dashboardTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.textSub,
    textAlign: "center",
    marginBottom: 20,
    letterSpacing: 1,
  },

  tripInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statItem: { alignItems: "center", flex: 1 },

  tripLabel: {
    fontSize: 10,
    color: COLORS.textSub,
    fontWeight: "700",
    marginTop: 4,
  },
  tripValue: { fontSize: 20, color: COLORS.textMain, fontWeight: "800" },

  divider: { width: 1, height: 30, backgroundColor: COLORS.border },
});
