import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ScrollView, Alert, InteractionManager } from "react-native";
import { router } from "expo-router";
import { X, Minus, Plus, ExternalLink, Image as ImageIcon, Trash2, ArrowRight } from "lucide-react-native";

import { CardShell, AppButton } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { PLANNER } from "@/lib/constants/gameplay";
import { hooksBag } from "@/lib/hooksBag";
import type { ItineraryItem } from "@/lib/models";

function ItemImage({ imageUrl, siteId }: { imageUrl?: string; siteId: string }) {
  const { location: site } = hooksBag.useLocation(imageUrl ? null : siteId);
  const uri = imageUrl || site?.imageThumbnailUrl || site?.imageUrl;
  if (!uri) {
    return (
      <View style={styles.imagePlaceholder}>
        <ImageIcon color={tokens.colors.borderStrong} size={32} />
      </View>
    );
  }
  return <Image source={{ uri }} style={styles.image} />;
}

type DayOption = { id: string; label: string; full?: boolean };

type EditItemModalProps = {
  item: ItineraryItem | null;
  currentDayId: string;
  availableDays: DayOption[];
  onClose: () => void;
  onSave: (itemId: string, newDurationSlots: number) => void;
  onRemove: (itemId: string) => void;
  onMoveDay: (itemId: string, newDayId: string) => void;
};

export function EditItemModal({
  item,
  currentDayId,
  availableDays,
  onClose,
  onSave,
  onRemove,
  onMoveDay,
}: EditItemModalProps) {
  const [draftDuration, setDraftDuration] = useState(2);
  const [isMovingDay, setIsMovingDay] = useState(false);

  useEffect(() => {
    if (item) {
      setDraftDuration(item.durationSlots || 2);
      setIsMovingDay(false);
    }
  }, [item]);

  const adjustDuration = (amount: number) => {
    setDraftDuration((prev) => Math.max(1, Math.min(PLANNER.MAX_GRID_SLOTS, prev + amount)));
  };

  const handleSave = () => {
    if (item) onSave(item.id, draftDuration);
  };

  const handleRemove = () => {
    if (!item) return;
    Alert.alert("Remove from Trip", `Remove ${item.siteName} from your itinerary?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => onRemove(item.id) },
    ]);
  };

  const handleMove = (newDayId: string) => {
    if (!item || isMovingDay) return;
    setIsMovingDay(true);
    onMoveDay(item.id, newDayId);
  };

  const handleViewDetails = () => {
    if (!item) return;
    onClose();
    InteractionManager.runAfterInteractions(() => {
      router.push(`/(app)/(tabs)/sites/${item.siteId.trim()}`);
    });
  };

  if (!item) return null;

  const otherDays = availableDays.filter((d) => d.id !== currentDayId && !d.full);

  return (
    <Modal visible={!!item} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalWrapper}>
          <CardShell status="basic" style={styles.modalContent}>
            <View style={styles.imageContainer}>
              <ItemImage imageUrl={item.imageUrl} siteId={item.siteId} />
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X color="#FFFFFF" size={20} />
              </TouchableOpacity>
            </View>

            <View style={styles.infoSection}>
              <View style={styles.titleRow}>
                <Text style={styles.modalTitle} numberOfLines={2}>
                  {item.siteName}
                </Text>
                <TouchableOpacity style={styles.detailLink} onPress={handleViewDetails}>
                  <Text style={styles.detailText}>Details</Text>
                  <ExternalLink color={tokens.colors.accent} size={14} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.controlSection}>
              <Text style={styles.modalLabel}>Planned Duration</Text>
              <View style={styles.durationControl}>
                <TouchableOpacity style={styles.durationBtn} onPress={() => adjustDuration(-1)}>
                  <Minus color={tokens.colors.accent} size={24} />
                </TouchableOpacity>
                <Text style={styles.durationValue}>
                  {draftDuration / 2} {draftDuration === 2 ? "Hour" : "Hours"}
                </Text>
                <TouchableOpacity style={styles.durationBtn} onPress={() => adjustDuration(1)}>
                  <Plus color={tokens.colors.accent} size={24} />
                </TouchableOpacity>
              </View>
            </View>

            {otherDays.length > 0 && (
              <View style={styles.moveSection}>
                <Text style={styles.modalLabel}>Move to another day?</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moveScroll}>
                  {otherDays.map((day) => (
                    <TouchableOpacity
                      key={day.id}
                      style={[styles.moveBtn, isMovingDay && styles.moveBtnDisabled]}
                      onPress={() => handleMove(day.id)}
                      disabled={isMovingDay}
                    >
                      <ArrowRight color={tokens.colors.text2} size={16} />
                      <Text style={styles.moveBtnText}>{day.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.actionContainer}>
              <AppButton variant="primary" onPress={handleSave}>
                Save Changes
              </AppButton>
              <TouchableOpacity style={styles.removeBtn} onPress={handleRemove}>
                <Trash2 color={tokens.colors.danger} size={18} />
                <Text style={styles.removeText}>Remove from Trip</Text>
              </TouchableOpacity>
            </View>
          </CardShell>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(36,26,18,0.75)", justifyContent: "flex-end" },
  modalWrapper: { margin: tokens.space.md, marginBottom: 40 },
  modalContent: { padding: 0, borderRadius: tokens.radius.lg, overflow: "hidden" },
  imageContainer: { height: 160, width: "100%", position: "relative", backgroundColor: tokens.colors.bgElevated },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  imagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoSection: { padding: tokens.space.lg, paddingBottom: tokens.space.md },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  modalTitle: { fontSize: 20, fontWeight: "800", flex: 1, marginRight: tokens.space.md, color: tokens.colors.text },
  detailLink: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: tokens.colors.accentDim,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: tokens.radius.lg,
  },
  detailText: { fontSize: 11, fontWeight: "700", color: tokens.colors.accent, marginRight: 4 },
  controlSection: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.md },
  modalLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: tokens.colors.text2, marginBottom: tokens.space.sm },
  durationControl: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: tokens.colors.bgCard,
    padding: tokens.space.sm,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  durationBtn: { width: 48, height: 48, alignItems: "center", justifyContent: "center", backgroundColor: tokens.colors.bgElevated, borderRadius: tokens.radius.md },
  durationValue: { fontSize: 20, fontWeight: "800", color: tokens.colors.accent },
  moveSection: { paddingBottom: tokens.space.lg },
  moveScroll: { paddingHorizontal: tokens.space.lg, gap: 8 },
  moveBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: tokens.colors.bgElevated,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  moveBtnDisabled: { opacity: 0.5 },
  moveBtnText: { fontSize: 13, fontWeight: "700", color: tokens.colors.text2, marginLeft: 6 },
  actionContainer: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.lg },
  removeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: tokens.space.md, paddingVertical: tokens.space.sm },
  removeText: { fontWeight: "700", color: tokens.colors.danger, marginLeft: 8 },
});