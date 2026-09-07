import React, { useEffect } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Screen, AppText, components } from "@/lib/uiKit";
import { useAuthForm } from "@/lib/hooks/useAuthForm";
import { useSession } from "@/lib/providers/SessionProvider";
import { tokens } from "@/lib/ui/tokens";
import * as AppleAuthentication from "expo-apple-authentication";
import { GoogleSigninButton } from "@react-native-google-signin/google-signin";
import { signInWithApple, getAppleSignInErrorMessage } from "@/lib/auth/appleSignIn";
import { signInWithGoogle, getGoogleSignInErrorMessage } from "@/lib/auth/googleSignIn";

// Te Puia geothermal terraces — already-uploaded R2 site photo, used as a
// full-bleed background rather than a boxed hero.
const HERO_IMAGE_URL = "https://api.blacksands.app/images/rotoruaguide/196f45fa-dc90-45fe-a146-61139450e49b.webp";

export default function LoginScreen() {
  const f = useAuthForm("login");
  const { session, enableGuest } = useSession();

  useEffect(() => {
    // Guest is not redirected here — see app/(auth)/_layout.tsx for why.
    if (session.status === "authed") {
      router.replace("/(app)/(tabs)/sites");
    }
  }, [session.status]);

  const busy = f.busy || session.status === "loading";

  const handleGuestEntry = async () => {
    // loggedOut: first-time guest entry. guest: already a guest, came here to
    // sign in, changed their mind — just take them back in.
    if (session.status !== "loggedOut" && session.status !== "guest") return;
    await enableGuest();
    router.replace("/(app)/(tabs)/map");
  };

  const [authErr, setAuthErr] = React.useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const handleAppleSignIn = async () => {
    setAuthErr(null);
    try {
      await signInWithApple();
    } catch (e) {
      if ((e as { code?: string })?.code === "ERR_REQUEST_CANCELED") return;
      setAuthErr(getAppleSignInErrorMessage(e));
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthErr(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      setAuthErr(getGoogleSignInErrorMessage(e));
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
              source={{ uri: HERO_IMAGE_URL }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition="top"
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

            <View style={[styles.brandContainer, { paddingTop: insets.top + tokens.space.lg }]}>
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
                    style={styles.appleButton}
                    onPress={() => void handleAppleSignIn()}
                  />
                )}
                {/* ponytail: iOS-only until the Android app is registered in Firebase (needs SHA-1) */}
                {Platform.OS === "ios" && (
                  <GoogleSigninButton
                    size={GoogleSigninButton.Size.Wide}
                    color={GoogleSigninButton.Color.Dark}
                    style={styles.appleButton}
                    onPress={() => void handleGoogleSignIn()}
                  />
                )}
                <View style={styles.orRow}>
                  <View style={[styles.orLine, { backgroundColor: tokens.colors.border }]} />
                  <AppText variant="label" style={{ color: tokens.colors.text2 }}>
                    or
                  </AppText>
                  <View style={[styles.orLine, { backgroundColor: tokens.colors.border }]} />
                </View>
              </View>

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
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  orLine: {
    flex: 1,
    height: 1,
  },
});
