import { Ionicons } from "@expo/vector-icons";
import { useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// 1. IMPORT THE HOOK
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_URL } from "../config";
import { supabase } from "../supabaseClient";
import { COLORS, SHADOWS } from "../theme";

export default function AddPassengerScreen({ navigation }) {
  // 2. GET THE INSETS
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  // Hide default header
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleSave = async () => {
    if (!name.trim() || !address.trim()) {
      Alert.alert("Missing Info", "Please enter both name and address.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Error", "You must be logged in.");
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/passengers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name,
          address: address,
          userId: user.id,
        }),
      });

      if (response.ok) {
        navigation.goBack();
      } else {
        const errorData = await response.json();
        Alert.alert("Error", errorData.error || "Could not save");
      }
    } catch (error) {
      Alert.alert("Error", "Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* WRAPPER: Handles Keyboard pushing content up */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* HEADER (Fixed at top) */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Passenger</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* SCROLLABLE CONTENT (Hero + Form) */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* HERO ICON */}
          <View style={styles.heroContainer}>
            <View style={styles.heroCircle}>
              <Ionicons name="person-add" size={40} color="white" />
            </View>
            <Text style={styles.heroText}>Create New Passenger</Text>
          </View>

          {/* FORM INPUTS */}
          <View style={styles.form}>
            <Text style={styles.label}>FULL NAME</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-outline"
                size={20}
                color={COLORS.textSub}
                style={{ marginRight: 10 }}
              />
              <TextInput
                style={styles.input}
                placeholder="e.g. Sarah Connor"
                placeholderTextColor={COLORS.textSub}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <Text style={styles.label}>PICKUP ADDRESS</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="location-outline"
                size={20}
                color={COLORS.textSub}
                style={{ marginRight: 10 }}
              />
              <TextInput
                style={styles.input}
                placeholder="e.g. Rothschild Blvd 10, Tel Aviv"
                placeholderTextColor={COLORS.textSub}
                value={address}
                onChangeText={setAddress}
                autoCapitalize="sentences"
              />
            </View>
          </View>
        </ScrollView>

        {/* 3. FOOTER BUTTON: Dynamic Padding applied here */}
        <View
          style={[
            styles.footer,
            { paddingBottom: 20 + insets.bottom }, // Lifts up based on device safe area
          ]}
        >
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.disabledButton]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={styles.saveText}>Confirm & Add</Text>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color="white"
                  style={{ marginLeft: 10 }}
                />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === "android" ? 30 : 0,
  },

  // Important: Tells the view to fill the screen
  keyboardView: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: COLORS.textMain },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    ...SHADOWS.small,
  },

  // Scroll Content (Adds padding so things don't stick to edges)
  scrollContent: { paddingHorizontal: 24, paddingBottom: 20 },

  // Hero Section
  heroContainer: { alignItems: "center", marginVertical: 30 },
  heroCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    ...SHADOWS.medium,
  },
  heroText: { fontSize: 16, color: COLORS.textSub, fontWeight: "600" },

  // Form
  form: { marginBottom: 20 },
  label: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.textSub,
    marginBottom: 8,
    marginTop: 15,
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingHorizontal: 15,
    height: 60,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  input: { flex: 1, fontSize: 16, color: COLORS.textMain, height: "100%" },

  // Footer
  footer: {
    paddingHorizontal: 24,
    // paddingBottom: 20, <--- REMOVED (Now dynamic in JSX)
    paddingTop: 10,
    backgroundColor: COLORS.background,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 60,
    borderRadius: 20,
    ...SHADOWS.medium,
  },
  disabledButton: { backgroundColor: "#9CA3AF" },
  saveText: { color: "white", fontWeight: "bold", fontSize: 18 },
});
