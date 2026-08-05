import React, { useState } from "react";
import { View, StyleSheet, Modal } from "react-native";
import { router } from "expo-router";
import { LogOut, User, Trash2, ShieldAlert, LogIn } from "lucide-react-native";

import { Screen, CardShell, Stack, Row, AppText, AppButton } from "@/lib/uiKit";
import { useSession } from "@/lib/providers/SessionProvider";
import { auth } from "@/lib/firebase";
import { userService } from "@/lib/services/userService";
import { tokens } from "@/lib/ui/tokens";

export default function AccountScreen() {
  const { session, disableGuest } = useSession();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    await disableGuest();
    await auth.signOut();
    router.replace("/(auth)/login");
  };

  const handleSignIn = async () => {
    await disableGuest();
    router.replace("/(auth)/login");
  };

  const handleDeleteAccount = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setIsDeleting(true);
    setError(null);

    try {
      await userService.deleteAccount(user);
      await disableGuest();
      router.replace("/(auth)/login");
    } catch (e: any) {
      if (e.code === "auth/requires-recent-login") {
        setError("Security: Please log out and back in before deleting.");
      } else {
        setError("Error deleting data. Please try again.");
      }
      setShowConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (session.status === "loading") {
    return (
      <Screen padded>
        <View style={styles.center}>
          <AppText variant="body" status="hint">Loading session...</AppText>
        </View>
      </Screen>
    );
  }

  const isAuthed = session.status === "authed";
  const isGuest = session.status === "guest";

  return (
    <Screen padded>
      <Stack gap="lg">
        <AppText variant="screenTitle">Account</AppText>

        <CardShell status="basic">
          <Stack gap="md">
            {isAuthed ? (
              <Stack gap="md">
                <Row gap="md" align="center">
                  <View style={styles.avatar}>
                    <User color={tokens.colors.text2} size={22} />
                  </View>
                  <Stack style={styles.flex1}>
                    <AppText variant="label" status="hint">Signed in as</AppText>
                    <AppText variant="body" style={styles.bold}>
                      {auth.currentUser?.email}
                    </AppText>
                  </Stack>
                </Row>

                <AppButton variant="secondary" onPress={handleLogout}>
                  <Row gap="xs" align="center">
                    <LogOut size={15} color={tokens.colors.text2} />
                    <AppText variant="label" style={{ color: tokens.colors.text2 }}>Log Out</AppText>
                  </Row>
                </AppButton>
              </Stack>
            ) : (
              <Stack gap="md">
                <AppText variant="body" style={{ color: tokens.colors.text2 }}>
                  {isGuest
                    ? "You're browsing as a guest. Sign in to save your progress."
                    : "Sign in to access your account."}
                </AppText>
                <AppButton variant="primary" onPress={handleSignIn}>
                  <Row gap="xs" align="center">
                    <LogIn size={16} color="#fff" />
                    <AppText style={{ color: "#fff", fontWeight: "700" }}>
                      Sign In / Create Account
                    </AppText>
                  </Row>
                </AppButton>
              </Stack>
            )}
          </Stack>
        </CardShell>

        {isAuthed && (
          <Stack gap="sm" style={{ marginTop: tokens.space.lg }}>
            <Row gap="xs" align="center">
              <ShieldAlert size={14} color={tokens.colors.danger} />
              <AppText variant="label" style={{ color: tokens.colors.danger }}>
                Security & Privacy
              </AppText>
            </Row>

            <CardShell status="danger">
              <Stack gap="md">
                <AppText variant="hint" style={{ color: tokens.colors.text2 }}>
                  Permanently remove your visit history and reviews. This cannot be undone.
                </AppText>

                {error && (
                  <View style={styles.errorBox}>
                    <AppText variant="label" style={{ color: tokens.colors.danger }}>{error}</AppText>
                  </View>
                )}

                <AppButton variant="ghost" onPress={() => setShowConfirm(true)} loading={isDeleting}>
                  <Row gap="xs" align="center">
                    <Trash2 size={15} color={tokens.colors.danger} />
                    <AppText variant="label" style={{ color: tokens.colors.danger }}>Delete Account</AppText>
                  </Row>
                </AppButton>
              </Stack>
            </CardShell>
          </Stack>
        )}
      </Stack>

      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <CardShell status="danger" style={styles.modalContent}>
            <Stack gap="lg">
              <Stack gap="xs">
                <AppText variant="sectionTitle">Are you absolutely sure?</AppText>
                <AppText variant="body" style={{ color: tokens.colors.text2 }}>
                  All progress and reviews will be permanently erased from Rotorua Guide's records.
                </AppText>
              </Stack>

              <Stack gap="sm">
                <AppButton variant="danger" onPress={handleDeleteAccount} loading={isDeleting}>
                  Delete Everything
                </AppButton>
                <AppButton variant="ghost" onPress={() => setShowConfirm(false)} disabled={isDeleting}>
                  <AppText variant="label" style={{ color: tokens.colors.text2 }}>
                    Wait, keep my account
                  </AppText>
                </AppButton>
              </Stack>
            </Stack>
          </CardShell>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  bold: { fontWeight: "800", color: tokens.colors.text },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: tokens.colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  errorBox: {
    backgroundColor: tokens.colors.dangerDim,
    padding: tokens.space.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: tokens.colors.danger,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.60)",
    justifyContent: "center",
    padding: tokens.space.lg,
  },
  modalContent: { width: "100%" },
});
