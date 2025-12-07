import { Ionicons } from "@expo/vector-icons";
import {
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// 1. IMPORT THE HOOK
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, SHADOWS } from "../theme";

export default function WelcomeScreen({ navigation }) {
  // 2. GET THE INSETS
  const insets = useSafeAreaInsets();

  // 3. NAVIGATION HANDLERS
  const handleGetStarted = () => {
    // New User -> Go to Signup
    navigation.navigate("Signup");
  };

  const handleLogin = () => {
    // Existing User -> Go to Login
    navigation.navigate("Login");
  };

  return (
    // 4. USE VIEW WITH DYNAMIC PADDING (Replaces SafeAreaView for better control)
    <View
      style={[
        styles.container,
        {
          paddingTop: Platform.OS === "android" ? 30 : insets.top, // Handle Status Bar
          paddingBottom: 20 + insets.bottom, // Lift buttons above Swipe Bar
        },
      ]}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* 1. HERO VISUAL & BRANDING */}
      <View style={styles.heroSection}>
        <View style={styles.logoBox}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.logoImage}
          />
        </View>

        <Text style={styles.appTitle}>
          Navi<Text style={{ color: COLORS.primary }}>Go</Text>
        </Text>
        <Text style={styles.tagline}>Smart routes. Faster rides.</Text>

        <Text style={styles.description}>
          Plan the shortest route to pick up all passengers — automatically.
        </Text>
      </View>

      {/* 2. KEY BENEFITS */}
      <View style={styles.benefitsContainer}>
        <BenefitRow
          icon="car-sport"
          text="Optimized routes – save time & fuel"
        />
        <BenefitRow icon="map" text="Multiple pickups – one smart path" />
        <BenefitRow icon="flash" text="One-tap navigation" />
      </View>

      {/* 3. PRIMARY ACTIONS (Bottom) */}
      <View style={styles.footer}>
        {/* Primary Button -> Signup */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleGetStarted}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
          <Ionicons
            name="arrow-forward"
            size={20}
            color="white"
            style={{ marginLeft: 10 }}
          />
        </TouchableOpacity>

        {/* Secondary Button -> Login */}
        <TouchableOpacity style={styles.secondaryButton} onPress={handleLogin}>
          <Text style={styles.secondaryButtonText}>Log In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Helper Component for Bullet Points
const BenefitRow = ({ icon, text }) => (
  <View style={styles.benefitRow}>
    <View style={styles.iconCircle}>
      <Ionicons name={icon} size={24} color={COLORS.primary} />
    </View>
    <Text style={styles.benefitText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    justifyContent: "space-between",
    // Note: Padding Top/Bottom are handled dynamically in JSX
  },

  // --- HERO SECTION ---
  heroSection: { alignItems: "center", marginTop: 20 },

  logoBox: {
    width: 140,
    height: 140,
    borderRadius: 35,
    overflow: "hidden",
    marginBottom: 25,
    backgroundColor: "white",
    ...SHADOWS.medium,
  },
  logoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  appTitle: {
    fontSize: 40,
    fontWeight: "900",
    color: COLORS.textMain,
    marginBottom: 5,
  },
  tagline: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textSub,
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: COLORS.textSub,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 10,
  },

  // --- BENEFITS SECTION ---
  benefitsContainer: { justifyContent: "center", marginVertical: 20 },

  benefitRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#DBEAFE", // Very light blue
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  benefitText: { fontSize: 16, fontWeight: "600", color: COLORS.textMain },

  // --- FOOTER BUTTONS ---
  footer: { width: "100%" },

  primaryButton: {
    backgroundColor: COLORS.primary,
    height: 58,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    ...SHADOWS.medium,
  },
  primaryButtonText: { color: "white", fontSize: 18, fontWeight: "bold" },

  secondaryButton: {
    backgroundColor: "white",
    height: 58,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  secondaryButtonText: {
    color: COLORS.textMain,
    fontSize: 18,
    fontWeight: "bold",
  },
});
