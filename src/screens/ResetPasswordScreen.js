import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../supabaseClient"; // Make sure path is correct

export default function ResetPasswordScreen() {
  const navigation = useNavigation();

  // Stages: 'EMAIL' (enter email) -> 'OTP' (enter code & password)
  const [stage, setStage] = useState("EMAIL");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 1: Send the Code to Email
  const handleSendCode = async () => {
    if (!email) return Alert.alert("Error", "Please enter your email.");

    setLoading(true);
    // We use signInWithOtp because it allows logging in via Code.
    // Once logged in, we can change the password.
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
    });

    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert(
        "Success",
        "Check your email for the 6-digit verification code!"
      );
      setStage("OTP"); // Move to next stage
    }
  };

  // Step 2: Verify Code and Update Password
  const handleResetPassword = async () => {
    if (!otp || !newPassword || !confirmPassword) {
      return Alert.alert("Error", "Please fill in all fields.");
    }
    if (newPassword !== confirmPassword) {
      return Alert.alert("Error", "Passwords do not match.");
    }

    setLoading(true);

    try {
      // A. Verify the OTP (This logs the user in)
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email,
        token: otp,
        type: "email", // or 'magiclink' depending on how it was sent
      });

      if (verifyError) throw verifyError;

      // B. Once logged in, update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      Alert.alert(
        "Success",
        "Your password has been updated! You are now logged in."
      );

      // Navigate to Home or Login
      navigation.reset({
        index: 0,
        routes: [{ name: "Home" }], // Change 'Home' to your main screen name
      });
    } catch (error) {
      Alert.alert("Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>

      {/* STAGE 1: ENTER EMAIL */}
      {stage === "EMAIL" && (
        <>
          <Text style={styles.subtitle}>
            Enter your email to receive a verification code.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TouchableOpacity
            style={styles.button}
            onPress={handleSendCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send Code</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      {/* STAGE 2: ENTER CODE & NEW PASSWORD */}
      {stage === "OTP" && (
        <>
          <Text style={styles.subtitle}>
            Enter the code sent to {email} and your new password.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="6-Digit Code (Check Email)"
            keyboardType="number-pad"
            value={otp}
            onChangeText={setOtp}
          />

          <TextInput
            style={styles.input}
            placeholder="New Password"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm New Password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Update Password</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setStage("EMAIL")}>
            <Text style={styles.linkText}>Wrong email? Try again.</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  linkText: {
    color: "#007AFF",
    textAlign: "center",
    marginTop: 15,
  },
});
