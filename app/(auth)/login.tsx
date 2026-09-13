import React, { useEffect } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View, TouchableWithoutFeedback, Keyboard } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Screen, AppText, components } from "@/lib/uiKit";
import { useAuthForm } from "@/lib/hooks/useAuthForm";
import { useSession } from "@/lib/providers/SessionProvider";
import { tokens } from "@/lib/ui/tokens";
import { SocialSignInButtons } from "@/components/auth/SocialSignInButtons";

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
  const [socialBusy, setSocialBusy] = React.useState(false);
  const insets = useSafeAreaInsets();
  const busy = f.busy || session.status === "loading" || socialBusy;

  return (
    <>
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
                <SocialSignInButtons onError={setAuthErr} onBusyChange={setSocialBusy} />
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
