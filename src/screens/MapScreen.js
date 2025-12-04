import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

// ---------------------------------------------------------
// 1. CONFIGURATION & HELPERS
// ---------------------------------------------------------
const DEFAULT_LOCATION = {
  lat: 32.0754,
  lng: 34.7757,
  name: "Tel Aviv (Default)",
};

function getDistance(p1, p2) {
  return Math.sqrt(Math.pow(p1.lat - p2.lat, 2) + Math.pow(p1.lng - p2.lng, 2));
}

// Optimization Algorithm (Nearest Neighbor)
function solveTSP(driver, passengers) {
  if (!passengers || passengers.length === 0) return [];

  let unvisited = [...passengers];
  let currentLoc = driver;
  let sortedPath = [];

  while (unvisited.length > 0) {
    let nearestIdx = -1;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const dist = getDistance(currentLoc, unvisited[i]);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIdx = i;
      }
    }
    const nextStop = unvisited[nearestIdx];
    sortedPath.push(nextStop);
    currentLoc = nextStop;
    unvisited.splice(nearestIdx, 1);
  }
  return sortedPath;
}

export default function MapScreen({ route }) {
  // 2. GET DATA FROM NAVIGATION
  const { passengersToRoute, finalDestination } = route.params || {
    passengersToRoute: [],
    finalDestination: null,
  };
  const [driverLocation, setDriverLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  // 3. GET REAL GPS LOCATION
  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Denied", "Using default location.");
          setDriverLocation(DEFAULT_LOCATION);
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        setDriverLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          name: "My Location",
        });
      } catch (error) {
        setDriverLocation(DEFAULT_LOCATION);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !driverLocation) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={{ marginTop: 10, fontWeight: "bold" }}>
          Locating Driver...
        </Text>
      </View>
    );
  }

  // 4. PREPARE THE DATA
  // Optimize the order of passengers
  const optimizedPassengers = solveTSP(driverLocation, passengersToRoute);

  // Create the full list: Driver -> Passengers -> Destination
  const allWaypoints = [driverLocation, ...optimizedPassengers];
  if (finalDestination) {
    allWaypoints.push(finalDestination);
  }

  // 5. GENERATE THE MAP HTML
  // We use Inline SVGs for icons so they NEVER fail to load.
  const mapHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script src="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { height: 100vh; width: 100vw; }
          .leaflet-routing-container { display: none; } /* Hide the text instructions box */
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          // Initialize Map
          var map = L.map('map');
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
          }).addTo(map);

          // Data from React Native
          var waypoints = ${JSON.stringify(allWaypoints)};
          var latLngs = waypoints.map(p => L.latLng(p.lat, p.lng));

          // Define SVG Icons (Reliable!)
          // We define a function to create a pin with a specific color
          function createSvgIcon(color) {
            return L.divIcon({
              className: 'custom-pin',
              html: \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40">
                        <path fill="\${color}" stroke="black" stroke-width="1" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                        <circle cx="12" cy="9" r="2.5" fill="white"/>
                      </svg>\`,
              iconSize: [40, 40],
              iconAnchor: [20, 40], // Point of the pin
              popupAnchor: [0, -40] // Where the popup opens
            });
          }

          var iconDriver = createSvgIcon('#4CAF50'); // Green
          var iconPassenger = createSvgIcon('#F44336'); // Red
          var iconDest = createSvgIcon('#000000'); // Black

          // Draw Route
          var control = L.Routing.control({
            waypoints: latLngs,
            lineOptions: { styles: [{color: '#2196F3', opacity: 0.8, weight: 6}] },
            createMarker: function(i, wp, nWps) {
              var isStart = (i === 0);
              var isEnd = (i === nWps - 1);
              
              var icon = iconPassenger;
              var title = "Stop #" + i;
              var name = waypoints[i].name;

              if (isStart) {
                icon = iconDriver;
                title = "Start";
              } else if (isEnd && ${finalDestination ? "true" : "false"}) {
                icon = iconDest;
                title = "Destination";
              }

              // Create the marker and bind the popup immediately
              return L.marker(wp.latLng, { icon: icon })
                .bindPopup("<b>" + title + "</b><br>" + name);
            },
            show: false, // Hide the turn-by-turn text box
            addWaypoints: false
          }).addTo(map);

          // Force Map to Fit All Points
          // We wait a tiny bit for the route to calculate, then zoom
          control.on('routesfound', function(e) {
            var routes = e.routes;
            var summary = routes[0].summary;
            // alert('Total distance: ' + summary.totalDistance / 1000 + ' km');
          });
          
          // Initial Zoom to include everyone
          var group = new L.featureGroup(waypoints.map(p => L.marker([p.lat, p.lng])));
          map.fitBounds(group.getBounds().pad(0.2));

        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={["*"]}
        source={{ html: mapHTML }}
        style={styles.map}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});
