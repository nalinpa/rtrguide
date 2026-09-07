import "dotenv/config";
import type { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Rotorua Guide",
  slug: "rotoruaguide",
  scheme: "rotoruaguide",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",

  ios: {
    bundleIdentifier: "app.blacksands.rtrguide",
    supportsTablet: false,
    usesAppleSignIn: true,
    googleServicesFile: process.env.GOOGLE_SERVICES_FILE ?? "./GoogleService-Info.plist",
    associatedDomains: ["applinks:commerce.blacksands.app", "applinks:commerce-staging.blacksands.app"],
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
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [{ scheme: "https", host: "commerce.blacksands.app", pathPrefix: "/claim" }],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },

  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#FBF7F1",
      },
    ],
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
        organization: "patel-td",
      },
    ],
    "expo-iap",
    [
      "expo-image-picker",
      {
        photosPermission: "Rotorua Guide accesses your photos so you can build a share card.",
        cameraPermission: "Rotorua Guide uses your camera so you can take a photo for your share card.",
        microphonePermission: false,
      },
    ],
    "expo-apple-authentication",
    [
      "@react-native-google-signin/google-signin",
      {
        iosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_IOS_REVERSED_CLIENT_ID,
      },
    ],
    "expo-image",
    "expo-sharing",
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
    google: {
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    },
  },
});
