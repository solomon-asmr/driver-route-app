import "dotenv/config";

export default {
  expo: {
    name: "NaviGo Driver",
    slug: "navigo",
    scheme: "com.solomon.navigo",
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
      // "expo-router", <--- REMOVED THIS LINE TO FIX CRASH
      "expo-web-browser",
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
        projectId: "32835c17-1854-4ebf-b18b-a1df4c0fbc57",
      },
    },
  },
};
