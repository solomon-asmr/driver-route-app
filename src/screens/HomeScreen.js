import { Ionicons } from "@expo/vector-icons";
import { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  SafeAreaView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { API_URL } from "../config";
import { supabase } from "../supabaseClient";
import { COLORS, SHADOWS } from "../theme";

export default function HomeScreen({ navigation, route }) {
  const [passengers, setPassengers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [destinationAddress, setDestinationAddress] = useState("");
  const [processingRoute, setProcessingRoute] = useState(false);

  // 1. HIDE DEFAULT HEADER
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // --- LOGIC SECTION ---
  useEffect(() => {
    if (route.params?.importedDestination)
      setDestinationAddress(route.params.importedDestination);
    if (route.params?.importedIds) {
      setSelectedIds((prev) => [
        ...new Set([...prev, ...route.params.importedIds]),
      ]);
      navigation.setParams({ importedDestination: null, importedIds: null });
    }
  }, [route.params]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () =>
      fetchPassengers()
    );
    return unsubscribe;
  }, [navigation]);

  const fetchPassengers = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const response = await fetch(`${API_URL}/passengers?userId=${user.id}`);
      const data = await response.json();
      if (response.ok) setPassengers(data);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (selectedIds.length === 0)
      return Alert.alert("Share", "Select passengers first.");
    try {
      const response = await fetch(`${API_URL}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passengerIds: selectedIds,
          destination: destinationAddress,
        }),
      });
      const data = await response.json();
      await Share.share({ message: `Route Import Code: ${data.code}` });
    } catch (error) {
      Alert.alert("Error", "Share failed.");
    }
  };

  const deletePassenger = async (id) => {
    Alert.alert("Delete", "Remove this passenger?", [
      { text: "Cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await fetch(`${API_URL}/passengers/${id}`, { method: "DELETE" });
          fetchPassengers();
        },
      },
    ]);
  };

  const togglePassenger = (id) => {
    if (selectedIds.includes(id))
      setSelectedIds(selectedIds.filter((pid) => pid !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  // --- NEW: Helper function to actually go to the map ---
  const proceedToMap = async (passengersToTake) => {
    setProcessingRoute(true);

    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        destinationAddress
      )}&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      setProcessingRoute(false);

      if (data.status === "OK" && data.results.length > 0) {
        const loc = data.results[0].geometry.location;
        const destCoords = {
          lat: loc.lat,
          lng: loc.lng,
          name: "Finish: " + destinationAddress,
        };

        // Navigate to Map
        navigation.navigate("Map", {
          passengersToRoute: passengersToTake, // This might be empty []
          finalDestination: destCoords,
        });
      } else {
        Alert.alert("Error", "Destination address not found.");
      }
    } catch (e) {
      setProcessingRoute(false);
      Alert.alert("Error", "Connection failed.");
    }
  };

  // --- UPDATED: Handle Button Click ---
  const handleOptimize = () => {
    // 1. Must have a destination
    if (!destinationAddress.trim()) {
      return Alert.alert("Missing Info", "Please enter a final destination.");
    }

    // 2. Determine Passengers
    const selectedPassengers = passengers.filter((p) =>
      selectedIds.includes(p.id)
    );

    // 3. Logic Check: Are there passengers?
    if (selectedPassengers.length === 0) {
      // CASE: No Passengers -> Ask Confirmation
      Alert.alert(
        "No Passengers Selected",
        "You haven't selected anyone. Do you want to drive directly to the destination?",
        [
          {
            text: "Add Passenger", // "Cancel" logic
            style: "cancel",
            onPress: () => {
              /* Do nothing, stay on screen */
            },
          },
          {
            text: "Drive Solo", // "Continue" logic
            onPress: () => proceedToMap([]), // Send empty array
          },
        ]
      );
    } else {
      // CASE: Normal -> Go immediately
      proceedToMap(selectedPassengers);
    }
  };

  // --- RENDER CARD ---
  const renderPassenger = ({ item }) => {
    const isSelected = selectedIds.includes(item.id);
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => togglePassenger(item.id)}
        style={[styles.card, isSelected && styles.cardSelected]}
      >
        <View style={styles.cardContent}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <View
              style={[
                styles.iconBox,
                isSelected
                  ? { backgroundColor: COLORS.secondary }
                  : { backgroundColor: "#F3F4F6" },
              ]}
            >
              <Ionicons
                name="person"
                size={24}
                color={isSelected ? "white" : COLORS.textSub}
              />
            </View>

            <View style={{ marginLeft: 15, flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <View style={styles.row}>
                <Ionicons
                  name="location-sharp"
                  size={14}
                  color={COLORS.primary}
                />
                <Text style={styles.address} numberOfLines={1}>
                  {item.address}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => deletePassenger(item.id)}
            style={styles.trashBtn}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Route</Text>
          <TouchableOpacity
            onPress={async () => {
              await supabase.auth.signOut();
              navigation.replace("Login");
            }}
            style={styles.logoutBtn}
          >
            <Ionicons name="log-out-outline" size={24} color={COLORS.danger} />
          </TouchableOpacity>
        </View>

        {/* DESTINATION */}
        <View style={styles.inputContainer}>
          <View style={styles.pinIcon}>
            <Ionicons name="flag" size={18} color="white" />
          </View>
          <TextInput
            style={styles.input}
            value={destinationAddress}
            onChangeText={setDestinationAddress}
            placeholder="Choose Destination..."
          />
        </View>

        {/* ACTION BAR */}
        <View style={styles.actionBar}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons
              name="people"
              size={18}
              color={COLORS.textSub}
              style={{ marginRight: 5 }}
            />
            <Text style={styles.sectionTitle}>Passengers</Text>
          </View>

          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate("AddPassenger")}
          >
            <Ionicons name="add" size={30} color="white" />
          </TouchableOpacity>

          <Text style={styles.totalCount}>{passengers.length} Total</Text>
        </View>

        {/* LIST */}
        {loading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={{ marginTop: 50 }}
          />
        ) : (
          <FlatList
            data={passengers}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderPassenger}
            contentContainerStyle={styles.listContent}
            onRefresh={fetchPassengers}
            refreshing={loading}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={60} color="#E5E7EB" />
                <Text style={{ color: COLORS.textSub, marginTop: 10 }}>
                  List is empty
                </Text>
              </View>
            }
          />
        )}

        {/* FOOTER */}
        <View style={styles.footer}>
          <View style={styles.footerSectionLeft}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="people"
                size={28}
                color={COLORS.primary}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.footerCount}>{selectedIds.length}</Text>
            </View>
            <Text style={styles.footerLabel}>Selected</Text>
          </View>

          <View style={styles.footerSectionMiddle}>
            <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
              <Ionicons name="share-social" size={24} color={COLORS.textMain} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate("Import")}
              style={styles.iconBtn}
            >
              <Ionicons name="download" size={24} color={COLORS.textMain} />
            </TouchableOpacity>
          </View>

          <View style={styles.footerSectionRight}>
            <TouchableOpacity
              style={[styles.goBtn, processingRoute && styles.disabledBtn]}
              onPress={handleOptimize}
              disabled={processingRoute}
            >
              {processingRoute ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Ionicons name="car-sport" size={32} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === "android" ? 30 : 0,
  },
  container: { flex: 1, paddingHorizontal: 20 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  headerTitle: { fontSize: 30, fontWeight: "800", color: COLORS.textMain },
  logoutBtn: { backgroundColor: "#FEE2E2", padding: 8, borderRadius: 12 },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 5,
    height: 60,
    marginBottom: 25,
    ...SHADOWS.small,
  },
  pinIcon: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.textMain,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 5,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textMain,
    paddingHorizontal: 10,
    fontWeight: "500",
  },

  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: COLORS.textSub },
  totalCount: { fontSize: 14, fontWeight: "700", color: COLORS.textSub },

  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.medium,
    marginTop: -10,
  },

  listContent: { paddingBottom: 130 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: 12,
    padding: 15,
    ...SHADOWS.small,
  },
  cardSelected: { borderColor: COLORS.secondary, borderWidth: 1.5 },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  iconBox: {
    width: 45,
    height: 45,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  name: { fontSize: 16, fontWeight: "bold", color: COLORS.textMain },
  row: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  address: { fontSize: 13, color: COLORS.textSub, marginLeft: 4, width: "90%" },
  trashBtn: { padding: 10 },

  emptyState: { alignItems: "center", marginTop: 50, opacity: 0.5 },

  footer: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    height: 80,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    ...SHADOWS.medium,
  },

  footerSectionLeft: { flex: 1, justifyContent: "center" },
  footerSectionMiddle: {
    flex: 1.5,
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
  },
  footerSectionRight: { flex: 1, alignItems: "flex-end" },

  footerLabel: {
    fontSize: 10,
    color: COLORS.textSub,
    textTransform: "uppercase",
    fontWeight: "700",
    marginTop: 2,
  },
  footerCount: { fontSize: 22, fontWeight: "800", color: COLORS.textMain },

  iconBtn: { padding: 12, backgroundColor: "#F3F4F6", borderRadius: 12 },

  goBtn: {
    backgroundColor: COLORS.primary,
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.medium,
  },
  disabledBtn: { backgroundColor: "#CBD5E1" },
});
