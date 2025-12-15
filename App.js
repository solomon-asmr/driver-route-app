import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, View } from "react-native";
import "./src/i18n"; // <--- ADD THIS LINE AT THE TOP

// IMPORT YOUR SCREENS
import AddPassengerScreen from "./src/screens/AddPassengerScreen";
import HomeScreen from "./src/screens/HomeScreen";
import ImportScreen from "./src/screens/ImportScreen";
import LoginScreen from "./src/screens/LoginScreen";
import MapScreen from "./src/screens/MapScreen";
import SignupScreen from "./src/screens/SignupScreen";
import WelcomeScreen from "./src/screens/WelcomeScreen"; // <--- ADD THIS IMPORT

const Stack = createNativeStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const isLoggedIn = await AsyncStorage.getItem("isLoggedIn");
        const lastActive = await AsyncStorage.getItem("lastActiveTimestamp");

        if (isLoggedIn === "true" && lastActive) {
          const now = Date.now();
          const diffMinutes = (now - parseInt(lastActive)) / 1000 / 60;

          if (diffMinutes < 30) {
            setInitialRoute("Home");
          } else {
            await AsyncStorage.multiRemove([
              "isLoggedIn",
              "lastActiveTimestamp",
            ]);
            setInitialRoute("Welcome"); // Expired? Go to Welcome, not Login
          }
        } else {
          setInitialRoute("Welcome"); // No session? Go to Welcome
        }
      } catch (e) {
        setInitialRoute("Welcome");
      }
    };

    checkSession();

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

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute}>
        {/* --- ADD WELCOME SCREEN HERE --- */}
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

        {/* Ensure these exist in your project, or comment them out if not created yet */}
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
