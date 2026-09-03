import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { OAuthProvider, signInWithCredential } from "firebase/auth";
import * as Sentry from "@sentry/react-native";
import { auth } from "@/lib/firebase";
import { client } from "@/lib/api";
import { getAuthErrorMessage } from "@/lib/auth/authErrors";

export const getAppleSignInErrorMessage = getAuthErrorMessage;

export async function signInWithApple(): Promise<void> {
  const nonceBytes = await Crypto.getRandomBytesAsync(16);
  const rawNonce = Array.from(nonceBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!appleCredential.identityToken) {
    throw new Error("Apple did not return an identity token");
  }

  const provider = new OAuthProvider("apple.com");
  const firebaseCredential = provider.credential({
    idToken: appleCredential.identityToken,
    rawNonce,
  });

  await signInWithCredential(auth, firebaseCredential);

  // Store the Apple refresh token server-side so account deletion can later
  // revoke it (App Store guideline 5.1.1(v)). Non-fatal: sign-in has already
  // succeeded on the Firebase side by this point, and a storage hiccup here
  // shouldn't block login.
  if (appleCredential.authorizationCode) {
    try {
      await client.auth.linkApple(appleCredential.authorizationCode);
    } catch (err) {
      console.error("failed to store Apple refresh token:", err);
      Sentry.captureException(err);
    }
  }
}
