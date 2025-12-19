import "dotenv/config";

export default {
  expo: {
    name: "NaviGo Driver",
    slug: "navigo",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/logo.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/logo.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.solomon.navigo",
    },
    android: {
      // 1. UNIQUE PACKAGE NAME
      package: "com.solomon.navigo",

      // 2. VERSION CODE (Increment for updates)
      versionCode: 1,

      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },

      // 3. EXPLICIT PERMISSIONS
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE",
      ],

      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY,
        },
      },
    },
    web: {
      favicon: "./assets/logo.png",
    },
    plugins: [
      // --- ADDED THESE TWO LINES TO FIX THE ERROR ---
      "expo-router",
      "expo-web-browser",
      // ----------------------------------------------
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "NaviGo needs your location to track trips and mark stops automatically.",
          // 4. ENSURE BACKGROUND LOCATION IS ENABLED IN PLUGIN
          isAndroidBackgroundLocationEnabled: true,
        },
      ],
    ],
    extra: {
      eas: {
        projectId: "198a4c49-6175-45ea-82ef-8d52714e813f",
      },
    },
  },
};
