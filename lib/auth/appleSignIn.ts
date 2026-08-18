import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { OAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "@/lib/firebase";

export function getAppleSignInErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code === "auth/account-exists-with-different-credential") {
    return "An account already exists with this email — sign in with your password instead.";
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function signInWithApple(): Promise<void> {
  const rawNonce = Math.random().toString(36).slice(2);
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
}
