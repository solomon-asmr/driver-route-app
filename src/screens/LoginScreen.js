import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  I18nManager,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../supabaseClient";
import { COLORS, SHADOWS } from "../theme";

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  // CHECK: Is the active language Hebrew OR Arabic?
  const isRTL = i18n.language === "he" || i18n.language === "ar";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Helper for RTL Text Alignment (Updates instantly)
  const textAlignStyle = { textAlign: isRTL ? "right" : "left" };

  const handleLogin = async () => {
    // 1. CLIENT-SIDE VALIDATION
    if (!email || !password) {
      // FIX: Localized Alert & Button
      Alert.alert(t("missing_info"), t("enter_email_password"), [
        { text: t("ok") },
      ]);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      // FIX: Localized OK Button for server errors
      Alert.alert(t("login_failed"), error.message, [{ text: t("ok") }]);
      setLoading(false);
    } else {
      try {
        await AsyncStorage.setItem("isLoggedIn", "true");
        await AsyncStorage.setItem(
          "lastActiveTimestamp",
          Date.now().toString()
        );
      } catch (e) {
        console.error("Failed to save session", e);
      }

      // Reset navigation stack so user can't go back to login
      navigation.reset({
        index: 0,
        routes: [{ name: "Home" }],
      });
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* HEADER WITH BACK BUTTON */}
        <View style={[styles.header, { marginTop: 10 }]}>
          <TouchableOpacity
            onPress={() => navigation.replace("Welcome")}
            style={styles.backBtn}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={COLORS.textMain}
              // Force flip if Hebrew/Arabic OR if the system is already in RTL mode
              style={{
                transform: [{ scaleX: isRTL || I18nManager.isRTL ? -1 : 1 }],
              }}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.contentContainer}>
          {/* LOGO */}
          <View style={styles.logoContainer}>
            <View style={styles.logoBox}>
              <Image
                source={require("../../assets/logo.png")}
                style={styles.logoImage}
              />
            </View>
            <Text style={styles.title}>{t("welcome_back")}</Text>
            <Text style={styles.subtitle}>{t("sign_in_continue")}</Text>
          </View>

          {/* FORM */}
          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={COLORS.textSub}
                style={{ marginEnd: 10 }} // RTL Safe
              />
              <TextInput
                style={[styles.input, textAlignStyle]}
                placeholder={t("email_placeholder")}
                placeholderTextColor={COLORS.textSub}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={COLORS.textSub}
                style={{ marginEnd: 10 }} // RTL Safe
              />
              <TextInput
                style={[styles.input, textAlignStyle]}
                placeholder={t("password_placeholder")}
                placeholderTextColor={COLORS.textSub}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.disabledBtn]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.loginText}>{t("login_button")}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>{t("new_here")}</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
                <Text style={styles.signupText}>{t("create_account")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Dynamic padding at bottom */}
        <View style={{ height: 20 + insets.bottom }} />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: { flex: 1, paddingHorizontal: 24 },

  header: {
    alignItems: "flex-start",
    marginBottom: 20,
  },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    ...SHADOWS.small,
  },

  contentContainer: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 50,
  },

  logoContainer: { alignItems: "center", marginBottom: 40 },

  logoBox: {
    width: 100,
    height: 100,
    borderRadius: 25,
    overflow: "hidden",
    backgroundColor: "white",
    marginBottom: 20,
    ...SHADOWS.medium,
  },
  logoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  title: { fontSize: 28, fontWeight: "bold", color: COLORS.textMain },
  subtitle: { fontSize: 16, color: COLORS.textSub, marginTop: 5 },

  form: { width: "100%" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    height: 60,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  input: { flex: 1, fontSize: 16, color: COLORS.textMain, height: "100%" },

  loginBtn: {
    backgroundColor: COLORS.primary,
    height: 60,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    ...SHADOWS.medium,
  },
  disabledBtn: { backgroundColor: "#9CA3AF" },
  loginText: { color: "white", fontSize: 18, fontWeight: "bold" },

  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  footerText: { color: COLORS.textSub, fontSize: 15 },
  signupText: { color: COLORS.primary, fontSize: 15, fontWeight: "bold" },
});
