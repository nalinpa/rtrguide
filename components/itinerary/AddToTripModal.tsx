import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { X, Minus, Plus, Image as ImageIcon } from "lucide-react-native";

import { CardShell, AppButton } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { useItineraries } from "@/lib/hooks/useItineraries";
import { runPhysicsEngine } from "@/lib/utils/itineraryPhysics";
import { PLANNER } from "@/lib/constants/gameplay";
import type { ItineraryItem } from "@/lib/models";

const TIME_OF_DAY = [
  { key: "morning", label: "Morning", startSlot: 1 },
  { key: "midday", label: "Midday", startSlot: 6 },
  { key: "afternoon", label: "Afternoon", startSlot: 12 },
  { key: "evening", label: "Evening", startSlot: 18 },
] as const;

type AddToTripModalProps = {
  site: { id: string; name: string; imageUrl?: string } | null;
  onClose: () => void;
  initialItineraryId?: string | null;
};

export function AddToTripModal({ site, onClose, initialItineraryId }: AddToTripModalProps) {
  const { itineraries, saveItinerary, isSaving } = useItineraries();

  const [itineraryId, setItineraryId] = useState<string | null>(null);
  const [dayId, setDayId] = useState<string | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<(typeof TIME_OF_DAY)[number]["key"]>("morning");
  const [durationSlots, setDurationSlots] = useState(2);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!site) return;
    const preselected = initialItineraryId ?? (itineraries.length === 1 ? itineraries[0].id : null);
    setItineraryId(preselected);
    const trip = itineraries.find((i) => i.id === preselected);
    setDayId(trip?.days[0]?.id ?? null);
    setTimeOfDay("morning");
    setDurationSlots(2);
    setErrorMsg(null);
  }, [site, initialItineraryId, itineraries]);

  if (!site) return null;

  const selectedTrip = itineraries.find((i) => i.id === itineraryId);

  const handleAdd = async () => {
    setErrorMsg(null);
    if (!selectedTrip || !dayId) {
      setErrorMsg("Choose a trip and a day.");
      return;
    }
    const day = selectedTrip.days.find((d) => d.id === dayId);
    if (!day) return;

    const startSlot = TIME_OF_DAY.find((t) => t.key === timeOfDay)!.startSlot;
    const newItem: ItineraryItem = {
      id: `item_${Date.now()}`,
      siteId: site.id,
      siteName: site.name,
      slotIndex: startSlot,
      timeLabel: "",
      durationLabel: "",
      durationSlots,
      imageUrl: site.imageUrl,
    };

    let items = [...day.items, newItem];
    items.sort((a, b) => (a.slotIndex || 0) - (b.slotIndex || 0));
    items = runPhysicsEngine(items);

    const last = items[items.length - 1];
    if ((last.slotIndex ?? 0) + (last.durationSlots ?? 2) > PLANNER.MAX_GRID_SLOTS) {
      setErrorMsg("This day is full. Try a different day or shorten the visit.");
      return;
    }

    const placedItem = items.find((i) => i.id === newItem.id)!;
    const updatedDays = selectedTrip.days.map((d) => (d.id === dayId ? { ...d, items } : d));

    await saveItinerary({ id: selectedTrip.id, days: updatedDays });
    onClose();
    router.push({
      pathname: "/(app)/(tabs)/itinerary/[itineraryId]",
      params: { itineraryId: selectedTrip.id, jumpToDay: dayId, jumpToSlot: String(placedItem.slotIndex) },
    });
  };

  return (
    <Modal visible={!!site} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.wrapper}>
          <CardShell status="basic" style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>Add to Itinerary</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X color={tokens.colors.text2} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <View style={styles.siteRow}>
                {site.imageUrl ? (
                  <Image source={{ uri: site.imageUrl }} style={styles.siteImage} />
                ) : (
                  <View style={styles.siteImagePlaceholder}>
                    <ImageIcon color={tokens.colors.borderStrong} size={22} />
                  </View>
                )}
                <Text style={styles.siteName} numberOfLines={2}>
                  {site.name}
                </Text>
              </View>

              {itineraries.length > 1 && (
                <>
                  <Text style={styles.label}>Trip</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                    {itineraries.map((trip) => (
                      <TouchableOpacity
                        key={trip.id}
                        style={[styles.pill, itineraryId === trip.id && styles.pillActive]}
                        onPress={() => {
                          setItineraryId(trip.id);
                          setDayId(trip.days[0]?.id ?? null);
                        }}
                      >
                        <Text style={[styles.pillText, itineraryId === trip.id && styles.pillTextActive]} numberOfLines={1}>
                          {trip.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {selectedTrip && (
                <>
                  <Text style={styles.label}>Day</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                    {selectedTrip.days.map((day, idx) => (
                      <TouchableOpacity
                        key={day.id}
                        style={[styles.pill, dayId === day.id && styles.pillActive]}
                        onPress={() => setDayId(day.id)}
                      >
                        <Text style={[styles.pillText, dayId === day.id && styles.pillTextActive]}>Day {idx + 1}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              <Text style={styles.label}>Time of Day</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                {TIME_OF_DAY.map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.pill, timeOfDay === t.key && styles.pillActive]}
                    onPress={() => setTimeOfDay(t.key)}
                  >
                    <Text style={[styles.pillText, timeOfDay === t.key && styles.pillTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Duration</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setDurationSlots((n) => Math.max(1, n - 1))}>
                  <Minus color={tokens.colors.accent} size={20} />
                </TouchableOpacity>
                <View style={styles.stepCenter}>
                  <Text style={styles.durationText}>
                    {durationSlots / 2} {durationSlots === 2 ? "Hour" : "Hours"}
                  </Text>
                </View>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setDurationSlots((n) => Math.min(PLANNER.MAX_GRID_SLOTS, n + 1))}>
                  <Plus color={tokens.colors.accent} size={20} />
                </TouchableOpacity>
              </View>

              {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

              <AppButton variant="primary" onPress={handleAdd} loading={isSaving} loadingLabel="Adding..." fullWidth>
                Add to Trip
              </AppButton>
            </ScrollView>
          </CardShell>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(36,26,18,0.6)", justifyContent: "flex-end" },
  wrapper: { margin: tokens.space.md, marginBottom: 40, maxHeight: "90%" },
  card: { borderRadius: tokens.radius.lg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: tokens.space.sm },
  title: { fontSize: 20, fontWeight: "800", color: tokens.colors.text },
  siteRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: tokens.space.sm },
  siteImage: { width: 48, height: 48, borderRadius: tokens.radius.md },
  siteImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  siteName: { flex: 1, fontSize: 16, fontWeight: "700", color: tokens.colors.text },
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: tokens.colors.text2, marginTop: tokens.space.md, marginBottom: tokens.space.sm },
  pillRow: { gap: 8, paddingBottom: 4 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.bgCard,
  },
  pillActive: { backgroundColor: tokens.colors.accent, borderColor: tokens.colors.accent },
  pillText: { fontSize: 13, fontWeight: "600", color: tokens.colors.text2 },
  pillTextActive: { color: "#FFFFFF" },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: tokens.colors.bgCard,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.xs,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  stepBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", backgroundColor: tokens.colors.bgElevated, borderRadius: tokens.radius.md },
  stepCenter: { flex: 1, alignItems: "center" },
  durationText: { fontSize: 18, fontWeight: "800", color: tokens.colors.accent },
  errorText: { fontSize: 12, color: tokens.colors.danger, marginTop: tokens.space.sm },
});