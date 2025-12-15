import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { I18nManager } from "react-native";

// Import translations
import ar from "./locales/ar.json"; // <--- 1. Import Arabic
import en from "./locales/en.json";
import he from "./locales/he.json";

const resources = {
  en: { translation: en },
  he: { translation: he },
  ar: { translation: ar }, // <--- 2. Register Arabic
};

// 3. Get device locale
const deviceLocale = Localization.getLocales()[0].languageCode;

let language = deviceLocale;

// Normalize legacy codes
if (language === "iw") language = "he";

// Strip region code (e.g. 'ar-SA' -> 'ar')
if (language.includes("-")) {
  language = language.split("-")[0];
}

// 4. Force RTL for BOTH Hebrew ('he') and Arabic ('ar')
const isRTL = language === "he" || language === "ar";

// Apply RTL settings if needed
if (isRTL && !I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
} else if (!isRTL && I18nManager.isRTL) {
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
}

i18n.use(initReactI18next).init({
  compatibilityJSON: "v3",
  resources,
  lng: language,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
