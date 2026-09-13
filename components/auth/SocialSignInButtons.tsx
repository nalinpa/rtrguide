import React, { useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import * as AppleAuthentication from "expo-apple-authentication";

import { AppText } from "@/lib/uiKit";
import { signInWithApple, getAppleSignInErrorMessage } from "@/lib/auth/appleSignIn";
import { signInWithGoogle, getGoogleSignInErrorMessage } from "@/lib/auth/googleSignIn";

// The native GoogleSigninButton renders a fixed-size platform asset inside
// whatever frame you give it — style width/height don't stretch it, so it
// never actually matched Apple's button even when both had the same box.
// A plain Pressable built from the same style object as Apple's button is
// the only way to guarantee identical size and shape.
function GoogleMark() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18">
      <Path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.62Z" fill="#4285F4" />
      <Path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z" fill="#34A853" />
      <Path d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33Z" fill="#FBBC05" />
      <Path d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58Z" fill="#EA4335" />
    </Svg>
  );
}

type SocialSignInButtonsProps = {
  onError: (message: string | null) => void;
  onBusyChange?: (busy: boolean) => void;
};

// Shared by the login screen and the claim screen. Renders a fragment so the
// parent's gap spaces the two buttons.
export function SocialSignInButtons({ onError, onBusyChange }: SocialSignInButtonsProps) {
  // Tracks *which* provider's sheet is open, not just whether one is — a
  // single shared boolean can't tell the two buttons apart, so signing in
  // with Apple was lighting up Google's spinner too. Set right before the
  // native sheet opens, only cleared on error/cancel below — on success it
  // stays set through the gap between the sheet closing and the session
  // listener moving the screen on, so it never sits there looking idle.
  // Left set forever if that never happens, but that's already a
  // broken sign-in with nothing useful to fall back to.
  const [signingInWith, setSigningInWithState] = useState<"apple" | "google" | null>(null);
  const socialBusy = signingInWith !== null;
  const setSigningInWith = (next: "apple" | "google" | null) => {
    setSigningInWithState(next);
    onBusyChange?.(next !== null);
  };

  const handleAppleSignIn = async () => {
    if (socialBusy) return;
    onError(null);
    setSigningInWith("apple");
    try {
      await signInWithApple();
    } catch (e) {
      if ((e as { code?: string })?.code === "ERR_REQUEST_CANCELED") {
        setSigningInWith(null);
        return;
      }
      onError(getAppleSignInErrorMessage(e));
      setSigningInWith(null);
    }
  };

  const handleGoogleSignIn = async () => {
    if (socialBusy) return;
    onError(null);
    setSigningInWith("google");
    try {
      const { signedIn } = await signInWithGoogle();
      if (!signedIn) setSigningInWith(null);
    } catch (e) {
      onError(getGoogleSignInErrorMessage(e));
      setSigningInWith(null);
    }
  };

  // ponytail: iOS-only until the Android app is registered in Firebase (needs SHA-1)
  if (Platform.OS !== "ios") return null;

  return (
    <>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={12}
        style={[styles.button, socialBusy && styles.dimmed]}
        onPress={() => void handleAppleSignIn()}
      />
      <Pressable style={[styles.button, socialBusy && styles.dimmed]} disabled={socialBusy} onPress={() => void handleGoogleSignIn()}>
        <View style={styles.googleInner}>
          {signingInWith === "google" ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <GoogleMark />
              <AppText style={styles.googleText}>Sign in with Google</AppText>
            </>
          )}
        </View>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  button: { width: "100%", height: 50 },
  dimmed: { opacity: 0.5 },
  googleInner: {
    width: "100%",
    height: 50,
    borderRadius: 12,
    backgroundColor: "#000000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  googleText: { color: "#FFFFFF", fontSize: 19, fontWeight: "600" },
});
