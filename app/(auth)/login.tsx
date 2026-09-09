import React, { useEffect } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { Screen, AppText, components } from "@/lib/uiKit";
import { useAuthForm } from "@/lib/hooks/useAuthForm";
import { useSession } from "@/lib/providers/SessionProvider";
import { tokens } from "@/lib/ui/tokens";
import * as AppleAuthentication from "expo-apple-authentication";
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

// Waiotapu Thermal Wonderland, bundled locally so it's available offline
// and paints with no network flash. Full-bleed background, anchored to the
// bottom edge since that's where the terraces sit in this crop.
const HERO_IMAGE = require("../../assets/login.webp");

export default function LoginScreen() {
  const f = useAuthForm("login");
  const { session, enableGuest } = useSession();

  useEffect(() => {
    // Guest is not redirected here — see app/(auth)/_layout.tsx for why.
    if (session.status === "authed") {
      router.replace("/(app)/(tabs)/sites");
    }
  }, [session.status]);

  const handleGuestEntry = async () => {
    // loggedOut: first-time guest entry. guest: already a guest, came here to
    // sign in, changed their mind — just take them back in.
    if (session.status !== "loggedOut" && session.status !== "guest") return;
    await enableGuest();
    router.replace("/(app)/(tabs)/map");
  };

  const [authErr, setAuthErr] = React.useState<string | null>(null);
  // Tracks *which* provider's sheet is open, not just whether one is — a
  // single shared boolean can't tell the two buttons apart, so signing in
  // with Apple was lighting up Google's spinner too. Set right before the
  // native sheet opens, only cleared on error/cancel below — on success it
  // stays set through the gap between the sheet closing and the session
  // listener redirecting away, so the screen never sits there looking idle.
  // Left set forever if the redirect never fires, but that's already a
  // broken sign-in with nothing useful to fall back to.
  const [signingInWith, setSigningInWith] = React.useState<"apple" | "google" | null>(null);
  const socialBusy = signingInWith !== null;
  const insets = useSafeAreaInsets();
  const busy = f.busy || session.status === "loading" || socialBusy;

  const handleAppleSignIn = async () => {
    if (socialBusy) return;
    setAuthErr(null);
    setSigningInWith("apple");
    try {
      await signInWithApple();
    } catch (e) {
      if ((e as { code?: string })?.code === "ERR_REQUEST_CANCELED") {
        setSigningInWith(null);
        return;
      }
      setAuthErr(getAppleSignInErrorMessage(e));
      setSigningInWith(null);
    }
  };

  const handleGoogleSignIn = async () => {
    if (socialBusy) return;
    setAuthErr(null);
    setSigningInWith("google");
    try {
      await signInWithGoogle();
    } catch (e) {
      setAuthErr(getGoogleSignInErrorMessage(e));
      setSigningInWith(null);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen padded={false}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
          >
            <Image
              source={HERO_IMAGE}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition="bottom"
            />
            <LinearGradient
              colors={[
                "rgba(31,75,61,0.85)",
                "rgba(31,75,61,0.55)",
                tokens.colors.bgBase,
              ]}
              locations={[0, 0.4, 0.85]}
              style={StyleSheet.absoluteFill}
            />

            <View
              style={[
                styles.brandContainer,
                { paddingTop: Math.max(0, insets.top + tokens.space.lg - 30) },
              ]}
            >
              <AppText variant="screenTitle" style={styles.appName}>
                Rotorua Guide
              </AppText>
              <AppText variant="label" style={styles.tagline}>
                Your guide to Rotorua
              </AppText>
            </View>

            <View style={styles.content}>
              <View style={styles.appleSection}>
                {Platform.OS === "ios" && (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={12}
                    style={[styles.appleButton, socialBusy && styles.socialButtonDimmed]}
                    onPress={() => void handleAppleSignIn()}
                  />
                )}
                {/* ponytail: iOS-only until the Android app is registered in Firebase (needs SHA-1) */}
                {Platform.OS === "ios" && (
                  <Pressable
                    style={[styles.appleButton, socialBusy && styles.socialButtonDimmed]}
                    disabled={socialBusy}
                    onPress={() => void handleGoogleSignIn()}
                  >
                    <View style={styles.googleButtonInner}>
                      {signingInWith === "google" ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <GoogleMark />
                          <AppText style={styles.googleButtonText}>Sign in with Google</AppText>
                        </>
                      )}
                    </View>
                  </Pressable>
                )}
                <View style={styles.orRow}>
                  <View style={[styles.orLine, { backgroundColor: "rgba(255,255,255,0.35)" }]} />
                  <AppText variant="label" style={styles.orLabel}>
                    or sign in with email
                  </AppText>
                  <View style={[styles.orLine, { backgroundColor: "rgba(255,255,255,0.35)" }]} />
                </View>
              </View>

              <LinearGradient
                colors={[tokens.colors.accent, tokens.colors.surf]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.authCardWrap}
              >
                <View style={styles.authCardInner}>
                  <components.AuthCard
                    mode={f.mode}
                    title={f.title}
                    subtitle={f.subtitle}
                    email={f.email}
                    password={f.password}
                    confirm={f.confirm}
                    busy={busy}
                    err={f.err ?? authErr}
                    notice={f.notice}
                    canSubmit={f.canSubmit}
                    onChangeMode={f.setMode}
                    onChangeEmail={f.setEmail}
                    onChangePassword={f.setPassword}
                    onChangeConfirm={f.setConfirm}
                    onSubmit={() => void f.submit()}
                    onGuest={handleGuestEntry}
                  />
                </View>
              </LinearGradient>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bgBase,
  },
  content: {
    paddingHorizontal: tokens.space.lg,
    paddingBottom: tokens.space.md,
  },
  brandContainer: {
    alignItems: "center",
    paddingHorizontal: tokens.space.lg,
    paddingBottom: tokens.space.xl,
  },
  appName: {
    color: "#FFFFFF",
    letterSpacing: -1.5,
  },
  tagline: {
    marginTop: 4,
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 3,
  },
  appleSection: {
    gap: tokens.space.md,
    marginBottom: tokens.space.lg,
  },
  appleButton: {
    width: "100%",
    height: 50,
  },
  socialButtonDimmed: {
    opacity: 0.5,
  },
  googleButtonInner: {
    width: "100%",
    height: 50,
    borderRadius: 12,
    backgroundColor: "#000000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  googleButtonText: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "600",
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  orLabel: {
    color: "rgba(255,255,255,0.85)",
  },
  // AuthCard is shared across the monorepo's apps and takes no style prop —
  // lift it with a wrapper here instead of touching the shared component.
  // Card white vs. the screen's cream bgBase is barely any value contrast,
  // so shadow alone reads as nothing — the accent-tinted ring is what
  // actually separates it from the background.
  // Orange-to-teal gradient frame — AuthCard is shared across the monorepo's
  // apps and has no style/color override prop, so this is the only way to
  // bring both accent colors into the card without touching the shared
  // component. The gradient's own padding is the visible border thickness;
  // authCardInner clips it back down to a plain card surface inside.
  authCardWrap: {
    borderRadius: 22,
    padding: 3,
    shadowColor: tokens.colors.surf,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 16,
  },
  authCardInner: {
    backgroundColor: tokens.colors.bgCard,
    borderRadius: 19,
  },
  orLine: {
    flex: 1,
    height: 1,
  },
});
