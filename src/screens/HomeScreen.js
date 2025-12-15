import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  I18nManager,
  KeyboardAvoidingView,
  Modal,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_URL } from "../config";
import { supabase } from "../supabaseClient";
import { COLORS, SHADOWS } from "../theme";

export default function HomeScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  // CHECK: Is the active language Hebrew OR Arabic?
  const isRTL = i18n.language === "he" || i18n.language === "ar";

  // --- STATE MANAGEMENT ---
  const [passengers, setPassengers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [destinationAddress, setDestinationAddress] = useState("");
  const [processingRoute, setProcessingRoute] = useState(false);

  // --- EDIT MODAL STATE ---
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");

  // --- REFS (Performance Caching) ---
  const userIdRef = useRef(null);

  // 1. LAYOUT CONFIGURATION
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // 2. HARDWARE BACK BUTTON HANDLER (Android)
  useEffect(() => {
    const backAction = () => {
      BackHandler.exitApp();
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );
    return () => backHandler.remove();
  }, []);

  // 3. HANDLE INCOMING PARAMS (From Import Screen)
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

  // 4. FETCH DATA ON FOCUS
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () =>
      fetchPassengers()
    );
    return unsubscribe;
  }, [navigation]);

  const getUserId = async () => {
    if (userIdRef.current) return userIdRef.current;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      userIdRef.current = user.id;
      return user.id;
    }
    return null;
  };

  const fetchPassengers = async () => {
    try {
      if (passengers.length === 0) setLoading(true);

      const currentUserId = await getUserId();
      if (!currentUserId) {
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${API_URL}/passengers?userId=${currentUserId}`
      );
      const data = await response.json();

      if (response.ok) setPassengers(data);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- ACTION HANDLERS ---

  const handleShare = async () => {
    if (selectedIds.length === 0)
      return Alert.alert(t("share_error"), "", [{ text: t("ok") }]);
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
      Alert.alert(t("error_title"), "Share failed.", [{ text: t("ok") }]);
    }
  };

  const deletePassenger = async (id) => {
    Alert.alert(t("remove"), t("delete_confirm"), [
      { text: t("cancel"), style: "cancel" }, // FIX: Added style: cancel
      {
        text: t("remove"),
        style: "destructive",
        onPress: async () => {
          const previousList = [...passengers];
          // Optimistic Update
          setPassengers((prev) => prev.filter((p) => p.id !== id));

          try {
            await fetch(`${API_URL}/passengers/${id}`, { method: "DELETE" });
          } catch (error) {
            Alert.alert(t("error_title"), "Could not delete passenger.", [
              { text: t("ok") },
            ]);
            setPassengers(previousList); // Revert on failure
          }
        },
      },
    ]);
  };

  const togglePassenger = (id) => {
    if (selectedIds.includes(id))
      setSelectedIds(selectedIds.filter((pid) => pid !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  // --- EDIT LOGIC ---
  const openEditModal = (passenger) => {
    setEditId(passenger.id);
    setEditName(passenger.name);
    setEditAddress(passenger.address);
    setEditModalVisible(true);
  };

  const saveEdit = async () => {
    if (!editName.trim() || !editAddress.trim()) {
      return Alert.alert(t("missing_info"), t("validation_error"), [
        { text: t("ok") },
      ]);
    }

    const currentUserId = await getUserId();
    if (!currentUserId) {
      Alert.alert(t("error_title"), t("logged_in_error"), [{ text: t("ok") }]);
      return;
    }

    // 1. Close Modal & Backup
    setEditModalVisible(false);
    const previousList = [...passengers];

    // 2. Optimistic Update
    setPassengers((prev) =>
      prev.map((p) =>
        p.id === editId ? { ...p, name: editName, address: editAddress } : p
      )
    );

    // 3. Sync to Backend
    try {
      const response = await fetch(`${API_URL}/passengers/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          address: editAddress,
          userId: currentUserId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error || `Server Error (${response.status})`;
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Save failed:", error);
      Alert.alert(t("error_title"), error.message, [{ text: t("ok") }]);
      setPassengers(previousList); // Rollback data
    }
  };

  // --- MAP LOGIC ---
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

        navigation.navigate("MapScreen", {
          passengersToRoute: passengersToTake,
          finalDestination: destCoords,
        });
      } else {
        Alert.alert(t("error_title"), "Destination address not found.", [
          { text: t("ok") },
        ]);
      }
    } catch (e) {
      setProcessingRoute(false);
      Alert.alert(t("connection_error_title"), t("connection_error_msg"), [
        { text: t("ok") },
      ]);
    }
  };

  const handleOptimize = () => {
    if (!destinationAddress.trim()) {
      return Alert.alert(t("missing_info"), t("choose_dest"), [
        { text: t("ok") },
      ]);
    }

    const selectedPassengers = passengers.filter((p) =>
      selectedIds.includes(p.id)
    );

    if (selectedPassengers.length === 0) {
      // FIX: Localized Alert Titles, Messages, and Buttons
      Alert.alert(
        t("alert_no_passengers_title"),
        t("alert_no_passengers_msg"),
        [
          { text: t("cancel"), style: "cancel" },
          { text: t("drive_solo"), onPress: () => proceedToMap([]) },
        ]
      );
    } else {
      proceedToMap(selectedPassengers);
    }
  };

  // --- RENDER ITEM ---
  const renderPassenger = ({ item }) => {
    const isSelected = selectedIds.includes(item.id);
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => togglePassenger(item.id)}
        style={[styles.card, isSelected && styles.cardSelected]}
      >
        <View style={styles.cardContent}>
          {/* LEFT SIDE: Icon + Text */}
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

          {/* RIGHT SIDE: Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => openEditModal(item)}
              style={styles.actionBtn}
            >
              <Ionicons
                name="create-outline"
                size={22}
                color={COLORS.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => deletePassenger(item.id)}
              style={styles.actionBtn}
            >
              <Ionicons name="trash-outline" size={22} color="#EF4444" />
            </TouchableOpacity>
          </View>
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
          <Text style={styles.headerTitle}>{t("my_route")}</Text>
          <TouchableOpacity
            onPress={async () => {
              await supabase.auth.signOut();
              await AsyncStorage.multiRemove([
                "isLoggedIn",
                "lastActiveTimestamp",
              ]);
              navigation.replace("Welcome");
            }}
            style={styles.logoutBtn}
          >
            <Ionicons name="log-out-outline" size={24} color={COLORS.danger} />
          </TouchableOpacity>
        </View>

        {/* DESTINATION INPUT (RTL Support) */}
        <View style={styles.inputContainer}>
          <View style={styles.pinIcon}>
            <Ionicons name="flag" size={18} color="white" />
          </View>
          <TextInput
            style={[
              styles.input,
              { textAlign: isRTL || I18nManager.isRTL ? "right" : "left" },
            ]}
            value={destinationAddress}
            onChangeText={setDestinationAddress}
            placeholder={t("choose_dest")}
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
            <Text style={styles.sectionTitle}>{t("passengers")}</Text>
          </View>

          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate("AddPassenger")}
          >
            <Ionicons name="add" size={30} color="white" />
          </TouchableOpacity>

          <Text style={styles.totalCount}>
            {passengers.length} {t("total")}
          </Text>
        </View>

        {/* LIST */}
        {loading && passengers.length === 0 ? (
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
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: 150 + insets.bottom },
            ]}
            onRefresh={fetchPassengers}
            refreshing={loading}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={60} color="#E5E7EB" />
                <Text style={{ color: COLORS.textSub, marginTop: 10 }}>
                  {t("list_empty")}
                </Text>
              </View>
            }
          />
        )}

        {/* FOOTER */}
        <View style={[styles.footer, { bottom: 20 + insets.bottom }]}>
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
            <Text style={styles.footerLabel}>{t("selected")}</Text>
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

      {/* --- EDIT MODAL (RTL Support) --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("edit_passenger")}</Text>

            <Text style={styles.label}>{t("name")}</Text>
            <TextInput
              style={[
                styles.modalInput,
                { textAlign: isRTL || I18nManager.isRTL ? "right" : "left" },
              ]}
              value={editName}
              onChangeText={setEditName}
              placeholder={t("name")}
            />

            <Text style={styles.label}>{t("address")}</Text>
            <TextInput
              style={[
                styles.modalInput,
                { textAlign: isRTL || I18nManager.isRTL ? "right" : "left" },
              ]}
              value={editAddress}
              onChangeText={setEditAddress}
              placeholder={t("address")}
              multiline={true}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelText}>{t("cancel")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={saveEdit}
              >
                <Text style={styles.saveText}>{t("save_changes")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

  // HEADER
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  headerTitle: { fontSize: 30, fontWeight: "800", color: COLORS.textMain },
  logoutBtn: { backgroundColor: "#FEE2E2", padding: 8, borderRadius: 12 },

  // INPUT
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

  // ACTION BAR
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

  // LIST ITEMS
  listContent: { flexGrow: 1 },
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

  // ACTION BUTTONS (Edit/Delete)
  actionRow: { flexDirection: "row" },
  actionBtn: { padding: 8, marginLeft: 5 },

  // EMPTY STATE
  emptyState: { alignItems: "center", marginTop: 50, opacity: 0.5 },

  // FOOTER
  footer: {
    position: "absolute",
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

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    ...SHADOWS.medium,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.textMain,
    marginBottom: 20,
    textAlign: "center",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSub,
    marginBottom: 5,
    marginLeft: 5,
  },
  modalInput: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: COLORS.textMain,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  modalBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: "#F3F4F6",
    marginEnd: 10, // RTL Safe
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
  },
  cancelText: {
    color: COLORS.textSub,
    fontWeight: "bold",
  },
  saveText: {
    color: "white",
    fontWeight: "bold",
  },
});
