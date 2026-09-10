import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import Constants from "expo-constants";
import { auth } from "@/lib/firebase";
import { getAuthErrorMessage } from "@/lib/auth/authErrors";

export const getGoogleSignInErrorMessage = getAuthErrorMessage;

export async function signInWithGoogle(): Promise<{ signedIn: boolean }> {
  const webClientId = Constants.expoConfig?.extra?.google?.webClientId as string;
  GoogleSignin.configure({ webClientId });
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const response = await GoogleSignin.signIn();
  if (response.type === "cancelled") return { signedIn: false };

  const idToken = response.data.idToken;
  if (!idToken) {
    throw new Error("Google did not return an id token");
  }

  const googleCredential = GoogleAuthProvider.credential(idToken);
  await signInWithCredential(auth, googleCredential);
  return { signedIn: true };
}
