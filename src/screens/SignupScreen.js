import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  I18nManager,
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

export default function SignupScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  // CHECK: Is the active language Hebrew OR Arabic?
  const isRTL = i18n.language === "he" || i18n.language === "ar";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Helper for RTL Text Alignment (Updates instantly)
  const textAlignStyle = { textAlign: isRTL ? "right" : "left" };

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert(t("missing_info"), t("enter_email_password"), [
        { text: t("ok") },
      ]);
      return;
    }

    setLoading(true);

    // --- UPDATED SIGN UP LOGIC FOR APP DEEP LINKING ---
    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        // This tells Supabase: "When they click the email link, open THIS app, not a webpage."
        emailRedirectTo: "com.solomon.navigo://signup-callback",
      },
    });

    if (error) {
      Alert.alert(t("signup_failed"), error.message, [{ text: t("ok") }]);
    } else {
      Alert.alert(
        t("success"),
        t("verification_email_sent") ||
          "Account created! Check your email to verify.",
        [
          // We send them to Login, but if they click the email link, the app will auto-open to Home.
          { text: t("ok"), onPress: () => navigation.replace("Login") },
        ]
      );
    }
    setLoading(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* HEADER */}
        <View style={[styles.header, { marginTop: 10 }]}>
          <TouchableOpacity
            onPress={() => navigation.navigate("Welcome")}
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
          {/* HERO TEXT */}
          <View style={styles.titleContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="person-add" size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>{t("signup_title")}</Text>
            <Text style={styles.subtitle}>{t("signup_subtitle")}</Text>
          </View>

          {/* FORM */}
          <View style={styles.form}>
            {/* EMAIL INPUT */}
            <Text style={[styles.label, textAlignStyle]}>
              {t("email_label")}
            </Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={COLORS.textSub}
                style={{ marginEnd: 10 }}
              />
              <TextInput
                style={[styles.input, textAlignStyle]}
                placeholder={t("signup_email_placeholder")}
                placeholderTextColor={COLORS.textSub}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* PASSWORD INPUT */}
            <Text style={[styles.label, textAlignStyle]}>
              {t("password_label")}
            </Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={COLORS.textSub}
                style={{ marginEnd: 10 }}
              />
              <TextInput
                style={[styles.input, textAlignStyle]}
                placeholder={t("signup_password_placeholder")}
                placeholderTextColor={COLORS.textSub}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.signupBtn, loading && styles.disabledBtn]}
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.signupText}>{t("create_account")}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>{t("already_have_account")}</Text>
              <TouchableOpacity onPress={() => navigation.replace("Login")}>
                <Text style={styles.loginLink}>{t("login_link")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

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

  header: { alignItems: "flex-start", marginBottom: 20 },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    ...SHADOWS.small,
  },

  contentContainer: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 60,
  },

  titleContainer: { alignItems: "center", marginBottom: 40 },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  title: { fontSize: 28, fontWeight: "bold", color: COLORS.textMain },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSub,
    marginTop: 5,
    textAlign: "center",
  },

  form: { width: "100%" },
  label: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.textSub,
    marginBottom: 8,
    marginTop: 10,
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    height: 60,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  input: { flex: 1, fontSize: 16, color: COLORS.textMain, height: "100%" },

  signupBtn: {
    backgroundColor: COLORS.primary,
    height: 60,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
    ...SHADOWS.medium,
  },
  disabledBtn: { backgroundColor: "#9CA3AF" },
  signupText: { color: "white", fontSize: 18, fontWeight: "bold" },

  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  footerText: { color: COLORS.textSub, fontSize: 15 },
  loginLink: { color: COLORS.primary, fontSize: 15, fontWeight: "bold" },
});
