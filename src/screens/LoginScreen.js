import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
// 1. IMPORT THE HOOK
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../supabaseClient";
import { COLORS, SHADOWS } from "../theme";

export default function LoginScreen({ navigation }) {
  // 2. GET INSETS
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert("Login Failed", error.message);
      setLoading(false);
    } else {
      // Success! Go to Home
      navigation.replace("Home");
    }
  };

  const handleSignUp = async () => {
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
        "Please check your email to confirm your account."
      );
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* 3. NEW HEADER WITH BACK BUTTON */}
        <View style={[styles.header, { marginTop: 10 }]}>
          <TouchableOpacity
            onPress={() => navigation.replace("Welcome")}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
          </TouchableOpacity>
        </View>

        <View style={styles.contentContainer}>
          {/* LOGO */}
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/logo.png")}
              style={styles.logo}
            />
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          {/* FORM */}
          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={COLORS.textSub}
                style={{ marginRight: 10 }}
              />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
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
                style={{ marginRight: 10 }}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
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
                <Text style={styles.loginText}>Log In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>New here? </Text>
              <TouchableOpacity onPress={handleSignUp}>
                <Text style={styles.signupText}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Dynamic padding at bottom for consistency */}
        <View style={{ height: 20 + insets.bottom }} />
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
  keyboardView: { flex: 1, paddingHorizontal: 24 },

  // Header Style
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
    justifyContent: "center", // Centers the form vertically
    paddingBottom: 50,
  },

  logoContainer: { alignItems: "center", marginBottom: 40 },
  logo: {
    width: 100,
    height: 100,
    resizeMode: "contain",
    marginBottom: 20,
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
