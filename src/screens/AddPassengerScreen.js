import { Ionicons } from "@expo/vector-icons";
import { useLayoutEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  I18nManager,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_URL } from "../config";
import { supabase } from "../supabaseClient";
import { COLORS, SHADOWS } from "../theme";

export default function AddPassengerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation(); // <--- Get i18n instance

  // CHECK: Is the active language Hebrew OR Arabic?
  const isRTL = i18n.language === "he" || i18n.language === "ar";

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  // Helper for RTL Text Alignment (Updates instantly)
  const textAlignStyle = { textAlign: isRTL ? "right" : "left" };

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleSave = async () => {
    if (!name.trim() || !address.trim()) {
      // FIX: Localized Alert & Button
      Alert.alert(t("missing_info"), t("validation_error"), [
        { text: t("ok") },
      ]);
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        // FIX: Localized Alert & Button
        Alert.alert(t("error_title"), t("logged_in_error"), [
          { text: t("ok") },
        ]);
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
        // FIX: Localized Alert & Button
        Alert.alert(t("error_title"), errorData.error || "Could not save", [
          { text: t("ok") },
        ]);
      }
    } catch (error) {
      // FIX: Localized Alert & Button
      Alert.alert(t("error_title"), t("server_error"), [{ text: t("ok") }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={COLORS.textMain}
              // Force flip if Hebrew OR if the system is already in RTL mode
              style={{
                transform: [{ scaleX: isRTL || I18nManager.isRTL ? -1 : 1 }],
              }}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("add_passenger_title")}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* SCROLLABLE CONTENT */}
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
            <Text style={styles.heroText}>{t("create_new_passenger")}</Text>
          </View>

          {/* FORM INPUTS */}
          <View style={styles.form}>
            {/* FULL NAME */}
            <Text style={[styles.label, textAlignStyle]}>
              {t("full_name_label")}
            </Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-outline"
                size={20}
                color={COLORS.textSub}
                style={{ marginEnd: 10 }} // RTL Safe
              />
              <TextInput
                style={[styles.input, textAlignStyle]}
                placeholder={t("name_placeholder")}
                placeholderTextColor={COLORS.textSub}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            {/* PICKUP ADDRESS */}
            <Text style={[styles.label, textAlignStyle]}>
              {t("pickup_address_label")}
            </Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="location-outline"
                size={20}
                color={COLORS.textSub}
                style={{ marginEnd: 10 }} // RTL Safe
              />
              <TextInput
                style={[styles.input, textAlignStyle]}
                placeholder={t("address_placeholder")}
                placeholderTextColor={COLORS.textSub}
                value={address}
                onChangeText={setAddress}
                autoCapitalize="sentences"
              />
            </View>
          </View>
        </ScrollView>

        {/* FOOTER BUTTON */}
        <View style={[styles.footer, { paddingBottom: 20 + insets.bottom }]}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.disabledButton]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={styles.saveText}>{t("confirm_add")}</Text>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color="white"
                  style={{ marginStart: 10 }} // RTL Safe
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
