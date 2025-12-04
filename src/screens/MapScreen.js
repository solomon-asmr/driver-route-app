import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

export default function MapScreen({ route }) {
  // 1. Get the data passed from HomeScreen
  // We expect "passengersToRoute" which is an array of objects
  const { passengersToRoute } = route.params || { passengersToRoute: [] };

  const driverLocation = { lat: 32.0853, lng: 34.7818, name: "Driver" };
  // Combine driver + passengers
  const allWaypoints = [driverLocation, ...passengersToRoute];

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
          .leaflet-routing-container { display: none; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map').setView([32.0700, 34.7725], 13);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
          }).addTo(map);

          // Get dynamic data
          var waypointsData = ${JSON.stringify(allWaypoints)};
          var latLngs = waypointsData.map(p => L.latLng(p.lat, p.lng));

          L.Routing.control({
            waypoints: latLngs,
            lineOptions: { styles: [{color: 'blue', opacity: 0.6, weight: 4}] },
            createMarker: function(i, wp, nWps) {
              var isDriver = (i === 0);
              var iconUrl = isDriver 
                ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/markers-default/marker-icon-2x-blue.png'
                : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/markers-default/marker-icon-2x-red.png';
              
              var iconObj = L.icon({
                iconUrl: iconUrl,
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
              });

              return L.marker(wp.latLng, { icon: iconObj })
                .bindPopup(waypointsData[i].name);
            },
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: true,
            show: false
          }).addTo(map);
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
});
