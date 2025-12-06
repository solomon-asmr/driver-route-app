import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../supabaseClient";
import { COLORS, SHADOWS } from "../theme";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAuth(type) {
    setLoading(true);
    const { error } =
      type === "LOGIN"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (error) {
      alert(error.message);
      setLoading(false);
    } else {
      setLoading(false);
      if (type === "LOGIN") navigation.replace("Home");
      else alert("Account created! Please Log In.");
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* LOGO AREA */}
        <View style={styles.logoContainer}>
          {/* THE ROUNDED BOX (Same technique as Welcome Screen) */}
          <View style={styles.roundedLogoBox}>
            <Image
              source={require("../../assets/logo.png")}
              style={styles.fullImage}
            />
          </View>

          <Text style={styles.title}>
            Navi<Text style={{ color: COLORS.primary }}>Go</Text>
          </Text>
          <Text style={styles.subtitle}>Route Optimization & Logistics</Text>
        </View>

        {/* INPUTS */}
        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Ionicons
              name="mail-outline"
              size={20}
              color={COLORS.textSub}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor={COLORS.textSub}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={COLORS.textSub}
              style={styles.inputIcon}
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

          {/* BUTTONS */}
          {loading ? (
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
              style={{ marginTop: 20 }}
            />
          ) : (
            <>
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => handleAuth("LOGIN")}
              >
                <Text style={styles.loginText}>Log In</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.signupButton}
                onPress={() => handleAuth("SIGNUP")}
              >
                <Text style={styles.signupText}>Create Account</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, justifyContent: "center", padding: 24 },

  logoContainer: { alignItems: "center", marginBottom: 40 },

  // --- NEW STYLING FOR LOGO ---
  roundedLogoBox: {
    width: 120,
    height: 120,
    borderRadius: 30, // Smooth rounded corners
    overflow: "hidden", // Cuts the image at the corners
    backgroundColor: "white",
    marginBottom: 20,
    ...SHADOWS.medium, // Adds the nice shadow
  },
  fullImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover", // Fills the box perfectly
  },
  // ---------------------------

  title: { fontSize: 32, fontWeight: "bold", color: COLORS.textMain },
  subtitle: { fontSize: 16, color: COLORS.textSub, marginTop: 5 },

  form: { width: "100%" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 55,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: COLORS.textMain, height: "100%" },

  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 55,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    ...SHADOWS.medium,
  },
  loginText: { color: COLORS.textLight, fontSize: 18, fontWeight: "bold" },

  signupButton: {
    marginTop: 15,
    alignItems: "center",
  },
  signupText: { color: COLORS.textSub, fontSize: 16 },
});
