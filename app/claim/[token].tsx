import React, { useEffect, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { Screen, AppText, AppButton, components } from "@/lib/uiKit";
import { useAuthForm } from "@/lib/hooks/useAuthForm";
import { useSession } from "@/lib/providers/SessionProvider";
import { client } from "@/lib/api";
import { tokens } from "@/lib/ui/tokens";

const COMMERCE_BASE_URL = "https://commerce.blacksands.app";

type ClaimInfo = { productName: string | null; used: boolean; expired: boolean; refunded: boolean };

export default function ClaimScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { session } = useSession();
  const f = useAuthForm("login");

  const [info, setInfo] = useState<ClaimInfo | null>(null);
  const [infoErr, setInfoErr] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimErr, setClaimErr] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    fetch(`${COMMERCE_BASE_URL}/v1/claim/${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((body: any) => {
        if (!body.ok) throw new Error(body.error ?? "invalid_token");
        setInfo(body.data);
      })
      .catch((e) => setInfoErr(e instanceof Error ? e.message : "Couldn't load this link."));
  }, [token]);

  const handleClaim = async () => {
    setClaiming(true);
    setClaimErr(null);
    try {
      await client.entitlements!.claim(token);
      setClaimed(true);
    } catch (e) {
      setClaimErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setClaiming(false);
    }
  };

  if (infoErr) {
    return (
      <Screen>
        <AppText variant="body">{infoErr}</AppText>
      </Screen>
    );
  }

  if (!info || session.status === "loading") {
    return (
      <Screen>
        <AppText variant="body">Loading…</AppText>
      </Screen>
    );
  }

  if (info.refunded || info.used || info.expired) {
    const reason = info.refunded ? "This purchase was refunded." : info.used ? "This link has already been used." : "This link has expired.";
    return (
      <Screen>
        <AppText variant="body">{reason}</AppText>
      </Screen>
    );
  }

  if (claimed) {
    return (
      <Screen>
        <AppText variant="sectionTitle">You're all set</AppText>
        <AppText variant="body">{info.productName ?? "Your purchase"} is now unlocked.</AppText>
        <AppButton variant="primary" onPress={() => router.replace("/(app)/(tabs)/sites")} fullWidth>
          Continue
        </AppButton>
      </Screen>
    );
  }

  if (session.status !== "authed") {
    return (
      <Screen padded={false}>
        <AppText variant="sectionTitle" style={{ padding: tokens.space.lg }}>
          Sign in to claim {info.productName ?? "your purchase"}
        </AppText>
        <components.AuthCard
          mode={f.mode}
          title={f.title}
          subtitle={f.subtitle}
          email={f.email}
          password={f.password}
          confirm={f.confirm}
          busy={f.busy}
          err={f.err}
          notice={f.notice}
          canSubmit={f.canSubmit}
          onChangeMode={f.setMode}
          onChangeEmail={f.setEmail}
          onChangePassword={f.setPassword}
          onChangeConfirm={f.setConfirm}
          onSubmit={() => void f.submit()}
          onGuest={() => {}}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="sectionTitle">Claim {info.productName ?? "your purchase"}?</AppText>
      <AppText variant="body">This will unlock it on your account.</AppText>
      {claimErr && <AppText variant="body">{claimErr}</AppText>}
      <AppButton variant="primary" onPress={handleClaim} disabled={claiming} fullWidth>
        {claiming ? "Claiming…" : "Claim"}
      </AppButton>
    </Screen>
  );
}