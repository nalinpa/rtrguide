import { initializeApp, getApps } from "firebase/app";
// @ts-ignore getReactNativePersistence is only declared in firebase's RN-conditioned types (open upstream gap)
import { getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const firebaseConfig = Constants.expoConfig?.extra?.firebase as {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

let authInstance: ReturnType<typeof getAuth>;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  authInstance = getAuth(app);
}

export const auth = authInstance;
