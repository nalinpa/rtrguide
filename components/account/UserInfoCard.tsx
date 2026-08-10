// components/account/UserInfoCard.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { LogIn, LogOut } from "lucide-react-native";

import { AppButton, AppText, Row } from "@/lib/uiKit";
import { useSession } from "@/lib/providers/SessionProvider";
import { auth } from "@/lib/firebase";
import { tokens } from "@/lib/ui/tokens";

export function UserInfoCard() {
  const { session, disableGuest } = useSession();
  const isAuthed = session.status === "authed";
  const isGuest = session.status === "guest";

  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = async () => {
    setLogoutError(null);
    try {
      await disableGuest();
      await auth.signOut();
      router.replace("/(auth)/login");
    } catch {
      setLogoutError("Failed to log out. Please try again.");
    }
  };

  const handleSignIn = async () => {
    await disableGuest();
    router.replace("/(auth)/login");
  };

  if (isAuthed) {
    return (
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} activeOpacity={0.6}>
          <LogOut size={14} color={tokens.colors.text2} strokeWidth={2} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
        {logoutError && (
          <AppText variant="label" style={[styles.errorText, { color: tokens.colors.danger }]}>
            {logoutError}
          </AppText>
        )}
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>ACCESS</Text>
      <Text style={styles.guestBody}>
        {isGuest
          ? "You're browsing as a guest. Sign in to save your progress."
          : "Sign in to access your Rotorua Guide account."}
      </Text>
      <AppButton variant="primary" onPress={handleSignIn}>
        <Row gap="xs" align="center">
          <LogIn size={16} color="#fff" />
          <AppText variant="label" style={{ color: "#fff" }}>
            Sign In / Create Account
          </AppText>
        </Row>
      </AppButton>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: tokens.space.md,
    paddingVertical: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 3,
    textTransform: "uppercase",
    color: tokens.colors.text2,
    marginBottom: 12,
  },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingVertical: 4,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: "500",
    color: tokens.colors.text2,
    letterSpacing: 0.3,
  },
  errorText: {
    marginTop: 8,
  },
  guestBody: {
    fontSize: 15,
    fontWeight: "400",
    color: tokens.colors.text2,
    lineHeight: 22,
    marginBottom: 16,
  },
});