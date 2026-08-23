import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { RotateCcw } from "lucide-react-native";

import { usePurchaseContext } from "@/lib/iap/PurchaseProvider";
import { tokens } from "@/lib/ui/tokens";

export function RestorePurchasesCard() {
  const { restore } = usePurchaseContext();
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleRestore = async () => {
    setRestoring(true);
    setMessage(null);
    try {
      const result = await restore();
      setMessage(result.restored > 0 ? `Restored ${result.restored} purchase${result.restored === 1 ? "" : "s"}.` : "Nothing to restore.");
    } catch (e) {
      console.log("[iap-debug] restore failed", e);
      setMessage("Couldn't restore purchases. Please try again.");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>PURCHASES</Text>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <RotateCcw size={18} color={tokens.colors.text} strokeWidth={2} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>Restore Purchases</Text>
          <Text style={styles.description}>Already bought the full guide on another device? Restore it here.</Text>
          {message && <Text style={styles.messageText}>{message}</Text>}
          <TouchableOpacity style={[styles.restoreBtn, restoring && styles.restoreBtnDisabled]} onPress={handleRestore} disabled={restoring} activeOpacity={0.6}>
            <Text style={styles.restoreBtnText}>{restoring ? "Restoring…" : "Restore Purchases"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: tokens.space.md, paddingVertical: 24 },
  sectionLabel: {
    fontSize: 11, fontWeight: "800", letterSpacing: 3, textTransform: "uppercase",
    color: tokens.colors.text2, marginBottom: 16,
  },
  row: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  iconWrap: {
    width: 40, height: 40, borderRadius: tokens.radius.md, backgroundColor: tokens.colors.bgCard,
    justifyContent: "center", alignItems: "center", marginTop: 1, flexShrink: 0,
  },
  textWrap: { flex: 1 },
  title: { fontSize: 15, fontWeight: "600", color: tokens.colors.text, marginBottom: 4 },
  description: { fontSize: 13, fontWeight: "400", color: tokens.colors.text2, lineHeight: 20, marginBottom: 14 },
  messageText: { fontSize: 12, color: tokens.colors.text2, marginBottom: 10, lineHeight: 18 },
  restoreBtn: {
    alignSelf: "flex-start", borderWidth: 1, borderColor: tokens.colors.border,
    borderRadius: tokens.radius.sm, paddingHorizontal: 14, paddingVertical: 7,
  },
  restoreBtnDisabled: { opacity: 0.4 },
  restoreBtnText: { fontSize: 13, fontWeight: "500", color: tokens.colors.text, letterSpacing: 0.1 },
});
