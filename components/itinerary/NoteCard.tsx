// components/itinerary/NoteCard.tsx
import { useRef } from "react";
import { View, Text, StyleSheet, Modal, Pressable } from "react-native";
import { StickyNote } from "lucide-react-native";

import { tokens } from "@/lib/ui/tokens";
import type { ItineraryItem } from "@/lib/models";

type NoteCardProps = {
  item: ItineraryItem | null;
  onClose: () => void;
};

// Same card look as DeleteTripModal. Tap anywhere to close.
export function NoteCard({ item, onClose }: NoteCardProps) {
  // Keep showing the last item while the modal fades out, instead of blanking.
  const shown = useRef(item);
  if (item) shown.current = item;

  return (
    <Modal visible={!!item} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={styles.overlay}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close note"
      >
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <StickyNote size={28} color={tokens.colors.accent} strokeWidth={2} />
          </View>
          <Text style={styles.title}>{shown.current?.siteName}</Text>
          <Text style={styles.body}>{shown.current?.note}</Text>
          <Text style={styles.hint}>Tap anywhere to close</Text>
        </View>
      </Pressable>
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
    backgroundColor: tokens.colors.accentDim,
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
  body: { fontSize: 15, color: tokens.colors.text, lineHeight: 23, textAlign: "center", marginBottom: 20 },
  hint: { fontSize: 12, fontWeight: "500", color: tokens.colors.text2 },
});
