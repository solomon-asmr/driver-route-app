import { Ionicons } from "@expo/vector-icons";
import { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ---------------------------------------------------------
// REPLACE THIS WITH YOUR COMPUTER'S IP ADDRESS!
// ---------------------------------------------------------
const API_URL = "http://10.21.70.38:3000/passengers";

export default function HomeScreen({ navigation }) {
  const [passengers, setPassengers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Setup the "Add (+)" Button in the header
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

  // 2. Refresh data when screen loads or when coming back from "Add" screen
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

  const togglePassenger = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((pid) => pid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Add this specific function to handle the API call
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
              // Call the new DELETE endpoint
              await fetch(`${API_URL}/${id}`, { method: "DELETE" });
              // Refresh the list to show they are gone
              fetchPassengers();
            } catch (error) {
              Alert.alert("Error", "Could not delete passenger");
            }
          },
        },
      ]
    );
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

        {/* Action Buttons Row */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {/* 1. DELETE BUTTON (Trash) */}
          <TouchableOpacity
            onPress={() => deletePassenger(item.id)}
            style={[
              styles.actionButton,
              { backgroundColor: "#FF5252", marginRight: 10 },
            ]}
          >
            <Ionicons name="trash" size={20} color="white" />
          </TouchableOpacity>

          {/* 2. SELECT BUTTON (+/-) */}
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
      <Text style={styles.header}>Today's Passengers</Text>

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

      <View style={styles.footer}>
        <Text style={styles.summaryText}>
          {selectedIds.length} Passengers Selected
        </Text>
        <TouchableOpacity
          style={[
            styles.optimizeButton,
            selectedIds.length === 0 && styles.disabledButton,
          ]}
          onPress={() => {
            if (selectedIds.length === 0) {
              Alert.alert(
                "No Passengers",
                "Please select at least one passenger."
              );
            } else {
              const selectedPassengers = passengers.filter((p) =>
                selectedIds.includes(p.id)
              );
              navigation.navigate("Map", {
                passengersToRoute: selectedPassengers,
              });
            }
          }}
        >
          <Text style={styles.optimizeText}>Optimize Route</Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", paddingTop: 20 },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 20,
    marginBottom: 10,
    color: "#333",
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
  addButton: {
    backgroundColor: "#2196F3",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  removeButton: { backgroundColor: "#FF5252" },
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
  // ... other styles ...
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
  // ... footer styles ...
});
