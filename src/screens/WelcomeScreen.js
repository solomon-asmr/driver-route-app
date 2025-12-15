import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  I18nManager,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, SHADOWS } from "../theme";

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation(); // <--- Get i18n object

  // CHECK: Is the current language RTL (Hebrew OR Arabic)?
  const isRTL = i18n.language === "he" || i18n.language === "ar";

  // NAVIGATION HANDLERS
  const handleGetStarted = () => {
    navigation.navigate("Signup");
  };

  const handleLogin = () => {
    navigation.navigate("Login");
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Platform.OS === "android" ? 30 : insets.top,
          paddingBottom: 20 + insets.bottom,
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
        <Text style={styles.tagline}>{t("welcome_tagline")}</Text>

        <Text style={styles.description}>{t("welcome_description")}</Text>
      </View>

      {/* 2. KEY BENEFITS */}
      <View style={styles.benefitsContainer}>
        <BenefitRow
          icon="car-sport"
          text={t("benefit_optimized")}
          isRTL={isRTL}
        />
        <BenefitRow icon="map" text={t("benefit_pickups")} isRTL={isRTL} />
        <BenefitRow icon="flash" text={t("benefit_navigation")} isRTL={isRTL} />
      </View>

      {/* 3. PRIMARY ACTIONS */}
      <View style={styles.footer}>
        {/* Primary Button -> Signup */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleGetStarted}
        >
          <Text style={styles.primaryButtonText}>{t("get_started")}</Text>

          {/* ARROW ICON */}
          <Ionicons
            name="arrow-forward"
            size={20}
            color="white"
            style={[
              styles.btnIcon,
              // Force flip if Hebrew/Arabic OR if the system is already in RTL mode
              {
                transform: [{ scaleX: isRTL || I18nManager.isRTL ? -1 : 1 }],
              },
            ]}
          />
        </TouchableOpacity>

        {/* Secondary Button -> Login */}
        <TouchableOpacity style={styles.secondaryButton} onPress={handleLogin}>
          <Text style={styles.secondaryButtonText}>{t("login")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Helper Component for Bullet Points
const BenefitRow = ({ icon, text, isRTL }) => (
  <View style={styles.benefitRow}>
    <View
      style={[
        styles.iconCircle,
        // Swap margin side based on language (Instant update)
        isRTL ? { marginLeft: 15 } : { marginRight: 15 },
      ]}
    >
      <Ionicons name={icon} size={24} color={COLORS.primary} />
    </View>
    <Text
      style={[
        styles.benefitText,
        // Align text right for RTL, Left for English (Instant update)
        { textAlign: isRTL ? "right" : "left" },
      ]}
    >
      {text}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    justifyContent: "space-between",
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
    textAlign: "center",
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

  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
  },

  benefitText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textMain,
    flex: 1,
  },

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

  btnIcon: {
    marginStart: 10,
  },

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
