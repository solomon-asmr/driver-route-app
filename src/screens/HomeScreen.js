import { Ionicons } from "@expo/vector-icons";
import { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ---------------------------------------------------------
// REPLACE THIS WITH YOUR COMPUTER'S IP ADDRESS!
// ---------------------------------------------------------
const API_URL = "http://10.21.70.38:3000/passengers";

// ---------------------------------------------------------
// REPLACE THIS WITH YOUR COMPUTER'S IP ADDRESS!
// ---------------------------------------------------------

// ---------------------------------------------------------
// REPLACE THIS WITH YOUR COMPUTER'S IP ADDRESS!
// ---------------------------------------------------------

export default function HomeScreen({ navigation }) {
  const [passengers, setPassengers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Destination State
  const [destinationAddress, setDestinationAddress] = useState(
    "Azrieli Center, Tel Aviv"
  );
  const [processingRoute, setProcessingRoute] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate("AddPassenger")}>
          <Ionicons
            name="add-circle"
            size={30}
            color="#2196F3"
            style={{ marginRight: 15 }}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchPassengers();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchPassengers = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL);
      const data = await response.json();
      setPassengers(data);
      setLoading(false);
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Connection Error",
        "Could not connect to backend. Check your IP."
      );
      setLoading(false);
    }
  };

  const deletePassenger = async (id) => {
    Alert.alert(
      "Delete Passenger",
      "Are you sure you want to remove this passenger permanently?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await fetch(`${API_URL}/${id}`, { method: "DELETE" });
              fetchPassengers();
            } catch (error) {
              Alert.alert("Error", "Could not delete passenger");
            }
          },
        },
      ]
    );
  };

  const togglePassenger = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((pid) => pid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const getCoordinates = async (address) => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        address
      )}`;
      const response = await fetch(url, {
        headers: { "User-Agent": "DriverApp/1.0" },
      });
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          name: "Finish: " + address,
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const handleOptimize = async () => {
    if (selectedIds.length === 0) {
      Alert.alert("No Passengers", "Please select at least one passenger.");
      return;
    }
    if (!destinationAddress.trim()) {
      Alert.alert("Missing Destination", "Please enter a destination address.");
      return;
    }

    setProcessingRoute(true);

    const destinationCoords = await getCoordinates(destinationAddress);

    setProcessingRoute(false);

    if (!destinationCoords) {
      Alert.alert(
        "Address Not Found",
        "Could not find location for: " + destinationAddress
      );
      return;
    }

    const selectedPassengers = passengers.filter((p) =>
      selectedIds.includes(p.id)
    );

    navigation.navigate("Map", {
      passengersToRoute: selectedPassengers,
      finalDestination: destinationCoords,
    });
  };

  const renderPassenger = ({ item }) => {
    const isSelected = selectedIds.includes(item.id);
    return (
      <View style={[styles.card, isSelected && styles.selectedCard]}>
        <View style={styles.textContainer}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.address}>{item.address}</Text>
          <Text style={styles.type}>{item.type}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => deletePassenger(item.id)}
            style={[
              styles.actionButton,
              { backgroundColor: "#FF5252", marginRight: 10 },
            ]}
          >
            <Ionicons name="trash" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => togglePassenger(item.id)}
            style={[
              styles.actionButton,
              { backgroundColor: isSelected ? "#4CAF50" : "#2196F3" },
            ]}
          >
            <Ionicons
              name={isSelected ? "checkmark" : "add"}
              size={24}
              color="white"
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Today's Route</Text>

      {/* 1. TOP SECTION: Destination Input */}
      <View style={styles.topSection}>
        <Text style={styles.label}>Final Destination:</Text>
        <TextInput
          style={styles.input}
          value={destinationAddress}
          onChangeText={setDestinationAddress}
          placeholder="e.g. Factory, Airport..."
        />
      </View>

      {/* 2. MIDDLE SECTION: List of Passengers */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#2196F3"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={passengers}
          keyExtractor={(item) => item.id}
          renderItem={renderPassenger}
          contentContainerStyle={styles.listContent}
          onRefresh={fetchPassengers}
          refreshing={loading}
        />
      )}

      {/* 3. BOTTOM SECTION: Action Button */}
      <View style={styles.footer}>
        <Text style={styles.summaryText}>{selectedIds.length} Selected</Text>

        <TouchableOpacity
          style={[
            styles.optimizeButton,
            (selectedIds.length === 0 || processingRoute) &&
              styles.disabledButton,
          ]}
          onPress={handleOptimize}
          disabled={processingRoute}
        >
          {processingRoute ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Text style={styles.optimizeText}>Optimize Route</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", paddingTop: 10 },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 20,
    marginBottom: 10,
    color: "#333",
  },

  // Top Input Styles
  topSection: {
    backgroundColor: "white",
    marginHorizontal: 15,
    marginBottom: 10,
    padding: 15,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  label: { fontSize: 14, fontWeight: "bold", marginBottom: 5, color: "#555" },
  input: {
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },

  listContent: { paddingBottom: 100, paddingHorizontal: 15 },

  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedCard: {
    borderColor: "#4CAF50",
    borderWidth: 2,
    backgroundColor: "#F0FFF0",
  },
  textContainer: { flex: 1 },
  name: { fontSize: 16, fontWeight: "bold", color: "#333" },
  address: { fontSize: 14, color: "#666", marginTop: 2 },
  type: { fontSize: 12, color: "#999", marginTop: 4, fontStyle: "italic" },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    elevation: 2,
  },

  // Footer Styles (Only for button now)
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  summaryText: { fontSize: 16, fontWeight: "600" },
  optimizeButton: {
    backgroundColor: "#4CAF50",
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: "center",
  },
  disabledButton: { backgroundColor: "#CCC" },
  optimizeText: { color: "white", fontWeight: "bold", marginRight: 5 },
});
