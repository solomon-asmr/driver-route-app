import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// REPLACE WITH YOUR COMPUTER'S IP
const API_URL = "http://10.21.70.38:3000/passengers";

export default function AddPassengerScreen({ navigation }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  const handleSave = async () => {
    if (!name || !address) {
      Alert.alert("Error", "Please fill in both fields");
      return;
    }

    try {
      // Send data to Server
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, address: address }),
      });

      if (response.ok) {
        // If successful, go back to Home
        Alert.alert("Success", "Passenger Added!");
        navigation.goBack();
      } else {
        Alert.alert("Error", "Server could not save data");
      }
    } catch (error) {
      Alert.alert("Error", "Could not connect to server");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Passenger Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. John Doe"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Address</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Dizengoff Center"
        value={address}
        onChangeText={setAddress}
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>Save Passenger</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  label: { fontSize: 16, fontWeight: "bold", marginTop: 20, marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#2196F3",
    marginTop: 30,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  saveText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
