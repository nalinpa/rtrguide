// components/itinerary/DeleteTripModal.tsx
import { View, Text, StyleSheet, Modal, TouchableOpacity } from "react-native";
import { AlertTriangle } from "lucide-react-native";

import { tokens } from "@/lib/ui/tokens";

type DeleteTripModalProps = {
  visible: boolean;
  tripTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
};

// Same danger-confirm visual language as components/account/DangerZoneCard.tsx,
// swapped in here for the OS-default Alert.alert that used to confirm this.
export function DeleteTripModal({ visible, tripTitle, onCancel, onConfirm }: DeleteTripModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <AlertTriangle size={28} color={tokens.colors.danger} strokeWidth={2} />
          </View>

          <Text style={styles.title}>Delete {tripTitle}?</Text>
          <Text style={styles.body}>
            This trip and everything in it will be permanently removed. This cannot be undone.
          </Text>

          <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm} activeOpacity={0.7}>
            <Text style={styles.confirmBtnText}>Delete Trip</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(36,26,18,0.60)", justifyContent: "center", padding: tokens.space.lg },
  card: { backgroundColor: tokens.colors.bgCard, borderRadius: tokens.radius.lg, padding: 28, alignItems: "center" },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.dangerDim,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: tokens.colors.text,
    letterSpacing: -0.3,
    marginBottom: 10,
    textAlign: "center",
  },
  body: { fontSize: 14, color: tokens.colors.text2, lineHeight: 22, textAlign: "center", marginBottom: 28 },
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
