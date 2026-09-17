import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { AlertCircle, CheckCircle2, Gift } from "lucide-react-native";
import * as SplashScreen from "expo-splash-screen";
import * as Sentry from "@sentry/react-native";
import { useQueryClient } from "@tanstack/react-query";
import { Screen, Stack, AppText, AppButton, LoadingState, components } from "@/lib/uiKit";
import { useAuthForm } from "@/lib/hooks/useAuthForm";
import { SocialSignInButtons } from "@/components/auth/SocialSignInButtons";
import { useSession } from "@/lib/providers/SessionProvider";
import { ApiError } from "@blacksands/client";
import { client } from "@/lib/api";
import { QUERY_KEY_PREFIX } from "@/lib/hooksBag";
import { COMMERCE_BASE_URL } from "@/lib/constants/commerce";
import { tokens } from "@/lib/ui/tokens";

type ClaimInfo = { productName: string | null; used: boolean; expired: boolean; refunded: boolean };

// Server error codes (commerce-api claimLinks.ts) → something a person can act on.
// A raw "invalid_token" or "Server unavailable (404)" was reaching the screen.
function claimErrorMessage(e: unknown): string {
  const code = e instanceof ApiError ? e.message : null;
  switch (code) {
    case "invalid_token":
    case "unknown_purchase":
      return "This link isn't valid. Make sure you opened the whole link, or ask for a new one.";
    case "token_used_or_expired":
    case "already_redeemed":
      return "This link has already been used or has expired.";
    case "refunded":
      return "This purchase was refunded, so it can't be claimed.";
    case "unauthorized":
      return "Your session has expired. Sign in again, then reopen the link.";
    default:
      return "Something went wrong. Check your connection and try again.";
  }
}

const goToApp = () => router.replace("/(app)/(tabs)/sites");

// One layout for every claim state: this route has no header (it sits outside the
// (app) tabs), so without the top spacing content hugged the status bar.
// Screen spreads extra props onto its ScrollView but is typed as ViewProps, hence the
// spread. Without these the sign-in form's password fields sit under the keyboard.
const KEYBOARD_SCROLL_PROPS = { automaticallyAdjustKeyboardInsets: true, keyboardShouldPersistTaps: "handled" };

function ClaimLayout({
  icon,
  title,
  message,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  message?: string;
  children?: React.ReactNode;
}) {
  return (
    <Screen scrollable {...KEYBOARD_SCROLL_PROPS}>
      <Stack gap="sm" align="center" style={styles.header}>
        <View style={styles.iconCircle}>{icon}</View>
        <AppText variant="h1" style={styles.center}>
          {title}
        </AppText>
        {message ? (
          <AppText variant="body" status="hint" style={styles.center}>
            {message}
          </AppText>
        ) : null}
      </Stack>
      <Stack gap="md" style={styles.actions}>
        {children}
      </Stack>
    </Screen>
  );
}

const errorIcon = <AlertCircle color={tokens.colors.danger} size={32} />;

export default function ClaimScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { session, enableGuest } = useSession();
  const f = useAuthForm("login");
  const queryClient = useQueryClient();
  const [socialErr, setSocialErr] = useState<string | null>(null);
  const [socialBusy, setSocialBusy] = useState(false);

  const [info, setInfo] = useState<ClaimInfo | null>(null);
  const [infoErr, setInfoErr] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimErr, setClaimErr] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);

  // This route sits outside both (auth) and (app) — the only two layouts
  // that call SplashScreen.hideAsync(). A cold-start deep link straight into
  // /claim/:token (Universal Link tap, app not already running) never mounts
  // either layout, so without this the native splash screen stays up forever,
  // covering everything this screen renders.
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    fetch(`${COMMERCE_BASE_URL}/v1/claim/${encodeURIComponent(token)}`)
      .then(async (res) => {
        const body: any = await res.json().catch(() => null);
        if (!res.ok || !body?.ok) throw new ApiError(res.status, body?.error ?? "server_error");
        setInfo(body.data);
      })
      .catch((e) => {
        console.error("[claim] load info failed:", e);
        // A bad or mistyped link is the user's problem, not a bug — keep it out of Sentry.
        if (!(e instanceof ApiError && e.status === 404)) Sentry.captureException(e);
        setInfoErr(claimErrorMessage(e));
      });
  }, [token]);

  const handleClaim = async () => {
    setClaiming(true);
    setClaimErr(null);
    try {
      await client.entitlements!.claim(token);
      // useEntitlements (enginev1/hooks) caches with a 5-minute staleTime and
      // nothing else triggers a refetch on claim — without this, "You're all
      // set" -> Continue would drop the user back into the app still reading
      // the pre-claim (locked) entitlement state.
      const uid = session.status === "authed" ? session.uid : null;
      await queryClient.invalidateQueries({ queryKey: [...QUERY_KEY_PREFIX, "entitlements", uid] });
      setClaimed(true);
    } catch (e) {
      console.error("[claim] claim failed:", e);
      Sentry.captureException(e);
      setClaimErr(claimErrorMessage(e));
    } finally {
      setClaiming(false);
    }
  };

  if (infoErr) {
    return (
      <ClaimLayout icon={errorIcon} title="Can't Open This Link" message={infoErr}>
        <AppButton variant="primary" onPress={goToApp} fullWidth>
          Go to App
        </AppButton>
      </ClaimLayout>
    );
  }

  if (!info || session.status === "loading") {
    return (
      <Screen>
        <LoadingState label="Checking your link..." />
      </Screen>
    );
  }

  const productName = info.productName ?? "your purchase";

  if (info.refunded || info.used || info.expired) {
    const reason = info.refunded
      ? "This purchase was refunded, so it can't be claimed."
      : info.used
        ? "This link has already been used."
        : "This link has expired. Ask for a new one.";
    return (
      <ClaimLayout icon={errorIcon} title="Link Can't Be Used" message={reason}>
        <AppButton variant="primary" onPress={goToApp} fullWidth>
          Go to App
        </AppButton>
      </ClaimLayout>
    );
  }

  if (claimed) {
    return (
      <ClaimLayout
        icon={<CheckCircle2 color={tokens.colors.success} size={32} />}
        title="You're All Set"
        message={`${info.productName ?? "Your purchase"} is now unlocked on your account.`}
      >
        <AppButton variant="primary" onPress={goToApp} fullWidth>
          Start Exploring
        </AppButton>
      </ClaimLayout>
    );
  }

  const giftIcon = <Gift color={tokens.colors.accent} size={32} />;

  if (session.status !== "authed") {
    return (
      <ClaimLayout icon={giftIcon} title="Sign In to Claim" message={`Sign in or create an account to unlock ${productName}.`}>
        <SocialSignInButtons onError={setSocialErr} onBusyChange={setSocialBusy} />
        <components.AuthCard
          mode={f.mode}
          title={f.title}
          subtitle={f.subtitle}
          email={f.email}
          password={f.password}
          confirm={f.confirm}
          busy={f.busy || socialBusy}
          err={f.err ?? socialErr}
          notice={f.notice}
          canSubmit={f.canSubmit}
          onChangeMode={f.setMode}
          onChangeEmail={f.setEmail}
          onChangePassword={f.setPassword}
          onChangeConfirm={f.setConfirm}
          onSubmit={() => void f.submit()}
          // AuthCard (shared @blacksands/components) always renders its guest button and
          // can't hide it — relabelled as the way out of this screen instead.
          labels={{ continueAsGuest: "Not Now" }}
          onGuest={async () => {
            if (session.status === "loggedOut") await enableGuest();
            goToApp();
          }}
        />
      </ClaimLayout>
    );
  }

  return (
    <ClaimLayout icon={giftIcon} title={`Claim ${productName}`} message="This unlocks it on the account you're signed in with.">
      {claimErr ? (
        <AppText variant="body" status="danger" style={styles.center}>
          {claimErr}
        </AppText>
      ) : null}
      <AppButton variant="primary" onPress={handleClaim} disabled={claiming} fullWidth>
        {claiming ? "Claiming..." : "Claim"}
      </AppButton>
      <AppButton variant="secondary" onPress={goToApp} disabled={claiming} fullWidth>
        Not Now
      </AppButton>
    </ClaimLayout>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: tokens.space.xl * 2, paddingHorizontal: tokens.space.xs },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: tokens.colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: tokens.space.xs,
  },
  center: { textAlign: "center" },
  actions: { marginTop: tokens.space.xl },
});
