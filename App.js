import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
// 1. IMPORT THE PROVIDER (Critical for Safe Area)
import { SafeAreaProvider } from "react-native-safe-area-context";

// Import Screens
import AddPassengerScreen from "./src/screens/AddPassengerScreen";
import HomeScreen from "./src/screens/HomeScreen";
import ImportScreen from "./src/screens/ImportScreen";
import LoginScreen from "./src/screens/LoginScreen";
import MapScreen from "./src/screens/MapScreen";
import WelcomeScreen from "./src/screens/WelcomeScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    // 2. WRAP APP IN SAFE AREA PROVIDER
    <SafeAreaProvider>
      <NavigationContainer>
        {/* 3. SET WELCOME AS DEFAULT STARTUP SCREEN */}
        <Stack.Navigator initialRouteName="Welcome">
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
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="Map"
            component={MapScreen}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="AddPassenger"
            component={AddPassengerScreen}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="Import"
            component={ImportScreen}
            options={{ title: "Import Route" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
