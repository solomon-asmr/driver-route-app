import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto"; // <--- 1. ALWAYS IMPORT THIS FIRST

// Load environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Safety Check: Crash/Warn early if keys are missing
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase Error: Missing env variables. Check your .env file.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,

    // <--- CRITICAL FOR MOBILE DEEP LINKING
    // We set this to false because React Native doesn't have a browser URL bar.
    // We handle the session manually in App.js using the onAuthStateChange listener.
    detectSessionInUrl: false,
  },
});
