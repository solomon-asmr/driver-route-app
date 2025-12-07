import "dotenv/config";

export default {
  expo: {
    name: "NaviGo",
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
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      package: "com.solomon.navigo",
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
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Allow NaviGo to use your location.",
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
