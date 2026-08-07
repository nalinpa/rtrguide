import "dotenv/config";
import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Rotorua Guide",
  slug: "rotoruaguide",
  scheme: "rotoruaguide",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,

  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#FBF7F1",
  },

  ios: {
    bundleIdentifier: "app.blacksands.rtrguide",
    supportsTablet: false,
    infoPlist: {
      NSLocationWhenInUseUsageDescription: "Rotorua Guide uses your location to verify your visits.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },

  android: {
    package: "app.blacksands.rtrguide",
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#FBF7F1",
    },
    permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"],
    edgeToEdgeEnabled: true,
  },

  plugins: [
    "expo-router",
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission: "Rotorua Guide uses your location to verify your visits.",
      },
    ],
    [
      "@sentry/react-native/expo",
      {
        url: "https://sentry.io/",
        project: "rotoruaguide",
        organization: "REPLACE_ME_SENTRY_ORG",
      },
    ],
  ],

  extra: {
    eas: {
      projectId: "a20dda00-eb80-45e7-80d5-0c695129a95f",
    },
    firebase: {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    },
  },
});
