import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AddPassengerScreen from "./src/screens/AddPassengerScreen"; // Import our screens
import HomeScreen from "./src/screens/HomeScreen";
import LoginScreen from "./src/screens/LoginScreen";
import MapScreen from "./src/screens/MapScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: "Welcome Driver" }}
        />

        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "Manage Passengers" }}
        />

        <Stack.Screen
          name="Map"
          component={MapScreen}
          options={{ title: "Optimized Route" }}
        />
        <Stack.Screen
          name="AddPassenger"
          component={AddPassengerScreen}
          options={{ title: "Add New Passenger" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
