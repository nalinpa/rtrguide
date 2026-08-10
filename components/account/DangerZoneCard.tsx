// components/account/DangerZoneCard.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Trash2, AlertTriangle } from "lucide-react-native";

import { useSession } from "@/lib/providers/SessionProvider";
import { auth } from "@/lib/firebase";
import { userService } from "@/lib/services/userService";
import { tokens } from "@/lib/ui/tokens";

export function DangerZoneCard() {
  const { disableGuest } = useSession();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ACCOUNT</Text>

        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Trash2 size={18} color={tokens.colors.danger} strokeWidth={2} />
          </View>

          <View style={styles.textWrap}>
            <Text style={styles.title}>Delete Account</Text>
            <Text style={styles.description}>
              Permanently remove your visit history and reviews. This cannot be undone.
            </Text>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.deleteBtn, isDeleting && styles.deleteBtnDisabled]}
              onPress={() => setShowConfirm(true)}
              disabled={isDeleting}
              activeOpacity={0.6}
            >
              <Text style={styles.deleteBtnText}>{isDeleting ? "Deleting…" : "Delete Account"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <AlertTriangle size={28} color={tokens.colors.danger} strokeWidth={2} />
            </View>

            <Text style={styles.modalTitle}>Are you absolutely sure?</Text>
            <Text style={styles.modalBody}>
              All progress and reviews will be permanently erased from Rotorua Guide's records.
            </Text>

            <TouchableOpacity
              style={[styles.confirmBtn, isDeleting && styles.deleteBtnDisabled]}
              onPress={handleDeleteAccount}
              disabled={isDeleting}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmBtnText}>{isDeleting ? "Deleting…" : "Delete Everything"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowConfirm(false)}
              disabled={isDeleting}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Wait, keep my account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: tokens.space.md, paddingVertical: 24 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 3,
    textTransform: "uppercase",
    color: tokens.colors.text2,
    marginBottom: 16,
  },
  row: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.dangerDim,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  textWrap: { flex: 1 },
  title: { fontSize: 15, fontWeight: "600", color: tokens.colors.text, marginBottom: 4 },
  description: { fontSize: 13, fontWeight: "400", color: tokens.colors.text2, lineHeight: 20, marginBottom: 14 },
  errorText: { fontSize: 12, color: tokens.colors.danger, marginBottom: 10, lineHeight: 18 },
  deleteBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: tokens.colors.danger,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  deleteBtnDisabled: { opacity: 0.4 },
  deleteBtnText: { fontSize: 13, fontWeight: "500", color: tokens.colors.danger, letterSpacing: 0.1 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(36,26,18,0.60)", justifyContent: "center", padding: tokens.space.lg },
  modalCard: { backgroundColor: tokens.colors.bgCard, borderRadius: tokens.radius.lg, padding: 28, alignItems: "center" },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.dangerDim,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: tokens.colors.text,
    letterSpacing: -0.3,
    marginBottom: 10,
    textAlign: "center",
  },
  modalBody: { fontSize: 14, color: tokens.colors.text2, lineHeight: 22, textAlign: "center", marginBottom: 28 },
  confirmBtn: {
    width: "100%",
    backgroundColor: tokens.colors.danger,
    borderRadius: tokens.radius.md,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 10,
  },
  confirmBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", letterSpacing: 0.1 },
  cancelBtn: { width: "100%", paddingVertical: 13, alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "500", color: tokens.colors.text2 },
});