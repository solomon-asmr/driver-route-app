import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLayoutEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  I18nManager,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
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

export default function ImportScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  // CHECK: Is the active language Hebrew OR Arabic?
  const isRTL = i18n.language === "he" || i18n.language === "ar";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  // Helper for RTL alignment (Updates instantly)
  // FIX: Changed 'isHebrew' (undefined) to 'isRTL'
  const textAlignStyle = { textAlign: isRTL ? "right" : "left" };

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleImport = async () => {
    if (!code.trim()) {
      // FIX: Localized Alert & Button
      Alert.alert(t("missing_code_title"), t("missing_code_msg"), [
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

      const response = await fetch(`${API_URL}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code, userId: user.id }),
      });

      const data = await response.json();

      if (response.ok) {
        // FIX: Localized Button + Wait for press to navigate (Better UX)
        Alert.alert(t("import_success_title"), t("import_success_msg"), [
          {
            text: t("ok"),
            onPress: () =>
              navigation.navigate("Home", {
                importedDestination: data.destination,
                importedIds: data.passengerIds,
              }),
          },
        ]);
      } else {
        // FIX: Localized Alert & Button
        Alert.alert(t("import_failed_title"), data.error || "Invalid Code", [
          { text: t("ok") },
        ]);
      }
    } catch (error) {
      console.error(error);
      // FIX: Localized Alert & Button
      Alert.alert(t("connection_error_title"), t("connection_error_msg"), [
        { text: t("ok") },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
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
              // FIX: Force flip using isRTL logic
              style={{
                transform: [{ scaleX: isRTL || I18nManager.isRTL ? -1 : 1 }],
              }}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("import_title")}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* HERO ICON */}
        <View style={styles.heroContainer}>
          <View style={styles.heroCircle}>
            <MaterialCommunityIcons
              name="cloud-download-outline"
              size={50}
              color={COLORS.primary}
            />
          </View>
          <Text style={styles.heroTitle}>{t("load_shared_route")}</Text>
          <Text style={styles.heroSubtitle}>{t("load_shared_subtitle")}</Text>
        </View>

        {/* INPUT AREA */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, textAlignStyle]}>
            {t("transfer_code_label")}
          </Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons
              name="ticket-confirmation-outline"
              size={24}
              color={COLORS.textSub}
              style={{ marginEnd: 10 }} // RTL Safe
            />
            <TextInput
              style={[styles.input, textAlignStyle]}
              placeholder="TR-XXXX"
              placeholderTextColor="#9CA3AF"
              value={code}
              onChangeText={(text) => setCode(text.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
            />
          </View>
        </View>

        {/* DYNAMIC FOOTER MARGIN */}
        <View style={[styles.footer, { marginBottom: 20 + insets.bottom }]}>
          <TouchableOpacity
            style={[styles.button, loading && styles.disabledButton]}
            onPress={handleImport}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={styles.buttonText}>{t("download_route_btn")}</Text>
                <Ionicons
                  name="download"
                  size={20}
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
  container: { flex: 1, paddingHorizontal: 24 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 40,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: COLORS.textMain },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    ...SHADOWS.small,
  },

  // Hero
  heroContainer: { alignItems: "center", marginBottom: 50 },
  heroCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 4,
    borderColor: "white",
    ...SHADOWS.medium,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textMain,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: COLORS.textSub,
    textAlign: "center",
    paddingHorizontal: 20,
  },

  // Input
  inputContainer: { marginBottom: 30 },
  label: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.textSub,
    marginBottom: 10,
    letterSpacing: 1,
    marginLeft: 5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    height: 65,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  input: {
    flex: 1,
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.textMain,
    letterSpacing: 2,
  },

  // Footer
  footer: {
    marginTop: "auto",
  },
  button: {
    backgroundColor: COLORS.primary,
    height: 60,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.medium,
  },
  disabledButton: { backgroundColor: "#9CA3AF" },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 18 },
});
