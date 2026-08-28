import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import Constants from "expo-constants";
import { auth } from "@/lib/firebase";

export function getGoogleSignInErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code === "auth/account-exists-with-different-credential") {
    return "An account already exists with this email — sign in with your password instead.";
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function signInWithGoogle(): Promise<void> {
  const webClientId = Constants.expoConfig?.extra?.google?.webClientId as string;
  GoogleSignin.configure({ webClientId });
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const response = await GoogleSignin.signIn();
  if (response.type === "cancelled") return;

  const idToken = response.data.idToken;
  if (!idToken) {
    throw new Error("Google did not return an id token");
  }

  const googleCredential = GoogleAuthProvider.credential(idToken);
  await signInWithCredential(auth, googleCredential);
}
