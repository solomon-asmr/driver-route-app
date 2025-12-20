import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  NavigationContainer,
  useNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Linking from "expo-linking";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, View } from "react-native";
import "react-native-gesture-handler"; // <--- ⚠️ MUST BE LINE 1 TO FIX CRASH
import "./src/i18n";

// --- SUPABASE CLIENT ---
import { supabase } from "./src/supabaseClient";

// --- SCREENS ---
import AddPassengerScreen from "./src/screens/AddPassengerScreen";
import HomeScreen from "./src/screens/HomeScreen";
import ImportScreen from "./src/screens/ImportScreen";
import LoginScreen from "./src/screens/LoginScreen";
import MapScreen from "./src/screens/MapScreen";
import ResetPasswordScreen from "./src/screens/ResetPasswordScreen";
import SignupScreen from "./src/screens/SignupScreen";
import WelcomeScreen from "./src/screens/WelcomeScreen";

const Stack = createNativeStackNavigator();

// --- DEEP LINKING CONFIGURATION ---
// (Kept this as a backup, even though we are using the Code flow now)
const linking = {
  prefixes: [Linking.createURL("/"), "com.solomon.navigo://"],
  config: {
    screens: {
      Welcome: "welcome",
      Login: "login",
      Signup: "signup",
      Home: "signup-callback",
      ResetPassword: "reset-callback",
    },
  },
};

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null);
  const appState = useRef(AppState.currentState);

  // Navigation Reference
  const navigationRef = useNavigationContainerRef();

  // --- SESSION CHECK LOGIC ---
  useEffect(() => {
    const checkSession = async () => {
      try {
        const isLoggedIn = await AsyncStorage.getItem("isLoggedIn");
        const lastActive = await AsyncStorage.getItem("lastActiveTimestamp");

        // If user is logged in, check if session is stale (30 mins)
        if (isLoggedIn === "true" && lastActive) {
          const now = Date.now();
          const diffMinutes = (now - parseInt(lastActive)) / 1000 / 60;

          if (diffMinutes < 30) {
            setInitialRoute("Home");
          } else {
            // Session expired
            await AsyncStorage.multiRemove([
              "isLoggedIn",
              "lastActiveTimestamp",
            ]);
            setInitialRoute("Welcome");
          }
        } else {
          setInitialRoute("Welcome");
        }
      } catch (e) {
        setInitialRoute("Welcome");
      }
    };

    checkSession();

    // Track App State for Session Timeout
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current === "active" &&
        nextAppState.match(/inactive|background/)
      ) {
        AsyncStorage.setItem("lastActiveTimestamp", Date.now().toString());
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // --- PASSWORD RECOVERY LISTENER ---
  // (We keep this just in case a user clicks a link, but your new flow uses OTP)
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          if (navigationRef.isReady()) {
            navigationRef.navigate("ResetPassword");
          }
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigationRef]);

  // Show loading spinner while checking session
  if (!initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking} ref={navigationRef}>
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Signup"
          component={SignupScreen}
          options={{ headerShown: false }}
        />

        {/* ✅ REGISTERED: The Reset Password Screen */}
        <Stack.Screen
          name="ResetPassword"
          component={ResetPasswordScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MapScreen"
          component={MapScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Import"
          component={ImportScreen}
          options={{ title: "Import Route" }}
        />
        <Stack.Screen
          name="AddPassenger"
          component={AddPassengerScreen}
          options={{ title: "Add Passenger" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
