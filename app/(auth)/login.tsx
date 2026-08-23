import React, { useEffect } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Stack, router } from "expo-router";
import { Screen, AppText, components } from "@/lib/uiKit";
import { useAuthForm } from "@/lib/hooks/useAuthForm";
import { useSession } from "@/lib/providers/SessionProvider";
import { tokens } from "@/lib/ui/tokens";
import * as AppleAuthentication from "expo-apple-authentication";
import { signInWithApple, getAppleSignInErrorMessage } from "@/lib/auth/appleSignIn";

export default function LoginScreen() {
  const f = useAuthForm("login");
  const { session, enableGuest } = useSession();

  useEffect(() => {
    if (session.status === "guest") {
      router.replace("/(app)/(tabs)/map");
    }
    if (session.status === "authed") {
      router.replace("/(app)/(tabs)/sites");
    }
  }, [session.status]);

  const busy = f.busy || session.status === "loading";

  const handleGuestEntry = async () => {
    if (session.status !== "loggedOut") return;
    await enableGuest();
  };

  const [appleErr, setAppleErr] = React.useState<string | null>(null);

  const handleAppleSignIn = async () => {
    setAppleErr(null);
    try {
      await signInWithApple();
    } catch (e) {
      if ((e as { code?: string })?.code === "ERR_REQUEST_CANCELED") return;
      setAppleErr(getAppleSignInErrorMessage(e));
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
            <View style={styles.content}>
              <View style={styles.brandContainer}>
                <AppText variant="screenTitle" style={styles.appName}>
                  Rotorua Guide
                </AppText>
                <AppText variant="label" style={styles.tagline}>
                  Your guide to Rotorua
                </AppText>
              </View>

              {Platform.OS === "ios" && (
                <View style={styles.appleSection}>
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={12}
                    style={styles.appleButton}
                    onPress={() => void handleAppleSignIn()}
                  />
                  <View style={styles.orRow}>
                    <View style={[styles.orLine, { backgroundColor: tokens.colors.border }]} />
                    <AppText variant="label" style={{ color: tokens.colors.text2 }}>
                      or
                    </AppText>
                    <View style={[styles.orLine, { backgroundColor: tokens.colors.border }]} />
                  </View>
                </View>
              )}

              <components.AuthCard
                mode={f.mode}
                title={f.title}
                subtitle={f.subtitle}
                email={f.email}
                password={f.password}
                confirm={f.confirm}
                busy={busy}
                err={f.err ?? appleErr}
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
    flex: 1,
    paddingHorizontal: tokens.space.lg,
    paddingBottom: tokens.space.md,
    paddingTop: tokens.space.xl,
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: tokens.space.md,
  },
  appName: {
    color: tokens.colors.text,
    letterSpacing: -1.5,
  },
  tagline: {
    marginTop: 4,
    color: tokens.colors.text2,
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
