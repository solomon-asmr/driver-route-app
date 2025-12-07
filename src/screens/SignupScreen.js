import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// 1. IMPORT THE HOOK
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../supabaseClient";
import { COLORS, SHADOWS } from "../theme";

export default function SignupScreen({ navigation }) {
  // 2. GET INSETS
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert("Missing Info", "Please enter both email and password.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert("Sign Up Failed", error.message);
    } else {
      Alert.alert(
        "Success!",
        "Account created! Please check your email to confirm.",
        [{ text: "OK", onPress: () => navigation.replace("Login") }]
      );
    }
    setLoading(false);
  };

  return (
    // 3. SAFE AREA FIX: Dynamic Top Padding
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
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
        </View>

        <View style={styles.contentContainer}>
          {/* HERO TEXT */}
          <View style={styles.titleContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="person-add" size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Start optimizing your routes today.
            </Text>
          </View>

          {/* FORM */}
          <View style={styles.form}>
            <Text style={styles.label}>EMAIL</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={COLORS.textSub}
                style={{ marginRight: 10 }}
              />
              <TextInput
                style={styles.input}
                placeholder="driver@example.com"
                placeholderTextColor={COLORS.textSub}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={COLORS.textSub}
                style={{ marginRight: 10 }}
              />
              <TextInput
                style={styles.input}
                placeholder="Minimum 6 characters"
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
                <Text style={styles.signupText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.replace("Login")}>
                <Text style={styles.loginLink}>Log In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 4. SAFE AREA FIX: Dynamic Bottom Padding */}
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
