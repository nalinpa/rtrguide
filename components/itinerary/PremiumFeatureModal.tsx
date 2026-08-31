import { View, Text, StyleSheet, Modal, TouchableOpacity } from "react-native";
import { X, Sparkles } from "lucide-react-native";

import { CardShell, AppButton } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";

type PremiumFeatureModalProps = {
  visible: boolean;
  onClose: () => void;
  onBuy: () => void;
  title?: string;
  message?: string;
};

export function PremiumFeatureModal({
  visible,
  onClose,
  onBuy,
  title = "Rearranging is a Premium feature",
  message = "Unlock the full guide to drag and reorder your day exactly how you want it.",
}: PremiumFeatureModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.wrapper}>
          <CardShell status="basic" style={styles.card}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X color={tokens.colors.text2} size={22} />
            </TouchableOpacity>
            <Sparkles color={tokens.colors.accent} size={28} style={styles.icon} />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
            <AppButton variant="primary" onPress={onBuy} fullWidth>
              Unlock Trip Planning
            </AppButton>
          </CardShell>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(36,26,18,0.75)", justifyContent: "flex-end" },
  wrapper: { margin: tokens.space.md, marginBottom: 40 },
  card: { alignItems: "center", padding: tokens.space.lg, paddingTop: tokens.space.xl },
  closeButton: { position: "absolute", top: 12, right: 12, padding: 6 },
  icon: { marginBottom: tokens.space.sm },
  title: { fontSize: 18, fontWeight: "800", color: tokens.colors.text, textAlign: "center", marginBottom: tokens.space.xs },
  message: { fontSize: 14, color: tokens.colors.text2, textAlign: "center", marginBottom: tokens.space.lg },
});
