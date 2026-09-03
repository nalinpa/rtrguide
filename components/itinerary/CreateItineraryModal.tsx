import { useEffect, useState } from "react";
import { View, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView } from "react-native";
import { ApiError } from "@blacksands/client";
import { X, Minus, Plus, ChevronDown, Check, CalendarDays, Lock } from "lucide-react-native";
import DateTimePicker from "react-native-ui-datepicker";
import dayjs from "dayjs";
import { randomUUID } from "expo-crypto";

import { CardShell, AppButton, AppText, Row } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { useItineraries } from "@/lib/hooks/useItineraries";
import { ITINERARY_TEMPLATES } from "@/lib/itineraryTemplates";
import { slotIndexToTimeLabel, slotsToDurationLabel } from "@/lib/utils/itineraryPhysics";

type CreateItineraryModalProps = {
  visible: boolean;
  locked?: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
  showTemplateOption?: boolean;
};

function tomorrow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-NZ", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function CreateItineraryModal({
  visible,
  locked = false,
  onClose,
  onCreated,
  showTemplateOption = false,
}: CreateItineraryModalProps) {
  const { itineraries, saveItinerary, isSaving } = useItineraries();

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(tomorrow());
  const [numDays, setNumDays] = useState(3);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const templatesEnabled = showTemplateOption && !locked;

  useEffect(() => {
    if (visible) {
      setTitle("");
      setStartDate(tomorrow());
      setNumDays(locked ? 1 : 3);
      setSelectedTemplate(null);
      setTemplateOpen(false);
      setShowCalendar(false);
      setErrorMsg(null);
    }
  }, [visible, locked]);

  const handleCreate = async () => {
    setErrorMsg(null);

    const resolvedTitle = title.trim() || "Rotorua Trip";
    const template = templatesEnabled ? ITINERARY_TEMPLATES.find((t) => t.key === selectedTemplate) : undefined;
    const dayCount = template ? template.days.length : numDays;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + dayCount - 1);

    const newStart = isoDate(startDate);
    const newEnd = isoDate(endDate);
    const conflict = itineraries.find(
      (itin) => newStart <= itin.endDate && newEnd >= itin.startDate,
    );
    if (conflict) {
      setErrorMsg(`Dates overlap with "${conflict.title}". Choose different dates.`);
      return;
    }

    const days = Array.from({ length: dayCount }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const items = (template?.days[i]?.items ?? []).map((item) => ({
        id: `item_${randomUUID()}`,
        siteId: item.siteId,
        siteName: item.siteName,
        slotIndex: item.slotIndex,
        durationSlots: item.durationSlots,
        timeLabel: slotIndexToTimeLabel(item.slotIndex),
        durationLabel: slotsToDurationLabel(item.durationSlots),
      }));
      return { id: `day_${i + 1}`, date: isoDate(d), items };
    });

    try {
      const savedId = await saveItinerary({
        title: resolvedTitle,
        startDate: isoDate(startDate),
        endDate: isoDate(endDate),
        days,
      });
      onCreated(savedId ?? "");
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrorMsg("Those dates overlap an existing trip. Pick a different range.");
      } else {
        setErrorMsg("Failed to create trip. Try again.");
      }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.wrapper}>
          <CardShell status="basic" style={styles.card}>
            <View style={styles.header}>
              <AppText style={styles.title}>New Trip</AppText>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X color={tokens.colors.text2} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false} keyboardShouldPersistTaps="handled">
              {locked && (
                <View style={styles.lockBanner}>
                  <Lock size={14} color={tokens.colors.textMuted} />
                  <AppText style={styles.lockBannerText}>Premium — unlock to customize your trip</AppText>
                </View>
              )}

              <AppText style={styles.label}>Trip Name</AppText>
              <TextInput
                style={[styles.input, locked && styles.inputLocked]}
                placeholder="Optional — defaults to Rotorua Trip"
                placeholderTextColor={tokens.colors.textMuted}
                value={title}
                onChangeText={setTitle}
                autoCapitalize="words"
                returnKeyType="done"
                editable={!locked}
              />

              <AppText style={styles.label}>Start Date</AppText>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowCalendar((o) => !o)}
                activeOpacity={0.7}
              >
                <CalendarDays size={16} color={tokens.colors.text2} />
                <AppText style={styles.dateInputText}>{formatDate(startDate)}</AppText>
                <ChevronDown
                  size={16}
                  color={tokens.colors.text2}
                  style={{ transform: [{ rotate: showCalendar ? "180deg" : "0deg" }] }}
                />
              </TouchableOpacity>
              {showCalendar && (
                <View style={styles.calendarWrapper}>
                  <DateTimePicker
                    mode="single"
                    date={startDate}
                    onChange={({ date }) => {
                      if (date) {
                        setStartDate(dayjs(date).toDate());
                        setShowCalendar(false);
                      }
                    }}
                    minDate={new Date()}
                    styles={{
                      selected: { backgroundColor: tokens.colors.accent },
                      selected_label: { color: "#FFFFFF" },
                      day_label: { color: tokens.colors.text },
                      today_label: { color: tokens.colors.accent },
                      month_selector_label: { color: tokens.colors.text },
                      year_selector_label: { color: tokens.colors.text },
                      weekday_label: { color: tokens.colors.text2 },
                    }}
                  />
                </View>
              )}

              {templatesEnabled && (
                <>
                  <AppText style={styles.label}>Suggested Itinerary</AppText>
                  <TouchableOpacity
                    style={styles.dropdownTrigger}
                    onPress={() => setTemplateOpen((o) => !o)}
                    activeOpacity={0.7}
                  >
                    <AppText style={styles.dropdownValue}>
                      {selectedTemplate === null
                        ? "None"
                        : (ITINERARY_TEMPLATES.find((t) => t.key === selectedTemplate)?.label ?? "None")}
                    </AppText>
                    <ChevronDown
                      size={16}
                      color={tokens.colors.text2}
                      style={{ transform: [{ rotate: templateOpen ? "180deg" : "0deg" }] }}
                    />
                  </TouchableOpacity>
                  {templateOpen && (
                    <ScrollView style={styles.dropdownMenu} bounces={false} nestedScrollEnabled>
                      {(
                        [{ key: null, label: "None", description: "Start with a blank trip" }, ...ITINERARY_TEMPLATES]
                      ).map((opt) => {
                        const active = selectedTemplate === opt.key;
                        return (
                          <TouchableOpacity
                            key={String(opt.key)}
                            style={styles.dropdownOption}
                            onPress={() => {
                              setSelectedTemplate(opt.key);
                              setTemplateOpen(false);
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={styles.dropdownOptionText}>
                              <AppText style={[styles.dropdownOptionLabel, active && styles.dropdownOptionLabelActive]}>
                                {opt.label}
                              </AppText>
                              <AppText style={styles.dropdownOptionSub}>{opt.description}</AppText>
                            </View>
                            {active && <Check size={16} color={tokens.colors.accent} strokeWidth={2.5} />}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                </>
              )}

              {selectedTemplate === null && (
                <>
                  <Row gap="xs" align="center">
                    <AppText style={styles.label}>Number of Days</AppText>
                    {locked && <Lock size={12} color={tokens.colors.textMuted} />}
                  </Row>
                  <View style={[styles.stepperRow, locked && styles.inputLocked]}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => setNumDays((n) => Math.max(1, n - 1))}
                      disabled={locked}
                    >
                      <Minus color={locked ? tokens.colors.textMuted : tokens.colors.accent} size={20} />
                    </TouchableOpacity>
                    <View style={styles.stepCenter}>
                      <AppText style={[styles.daysText, locked && styles.daysTextLocked]}>
                        {numDays} {numDays === 1 ? "day" : "days"}
                      </AppText>
                    </View>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => setNumDays((n) => Math.min(14, n + 1))}
                      disabled={locked}
                    >
                      <Plus color={locked ? tokens.colors.textMuted : tokens.colors.accent} size={20} />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {errorMsg && <AppText style={styles.errorText}>{errorMsg}</AppText>}

              <AppButton variant="primary" onPress={handleCreate} loading={isSaving} loadingLabel="Creating..." fullWidth>
                Create Trip
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
  lockBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: tokens.colors.bgElevated,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    marginBottom: tokens.space.xs,
  },
  lockBannerText: { fontSize: 12, fontWeight: "600", color: tokens.colors.textMuted },
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: tokens.colors.text2, marginTop: tokens.space.md },
  inputLocked: { opacity: 0.5 },
  input: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    paddingVertical: 14,
    fontSize: 15,
    color: tokens.colors.text,
    backgroundColor: tokens.colors.bgCard,
  },
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
  stepCenter: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    paddingVertical: 14,
    backgroundColor: tokens.colors.bgCard,
  },
  dateInputText: { fontSize: 15, color: tokens.colors.text, flex: 1 },
  calendarWrapper: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.bgCard,
    overflow: "hidden",
    marginTop: 4,
  },
  daysText: { fontSize: 20, fontWeight: "800", color: tokens.colors.accent },
  daysTextLocked: { color: tokens.colors.textMuted },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    paddingVertical: 14,
    backgroundColor: tokens.colors.bgCard,
  },
  dropdownValue: { fontSize: 15, color: tokens.colors.text },
  dropdownMenu: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    overflow: "hidden",
    marginTop: 4,
    maxHeight: 220,
  },
  dropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.space.md,
    paddingVertical: 12,
    backgroundColor: tokens.colors.bgCard,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.border,
  },
  dropdownOptionText: { flex: 1 },
  dropdownOptionLabel: { fontSize: 15, fontWeight: "500", color: tokens.colors.text },
  dropdownOptionLabelActive: { color: tokens.colors.accent, fontWeight: "700" },
  dropdownOptionSub: { fontSize: 12, color: tokens.colors.text2, marginTop: 2 },
  errorText: { fontSize: 12, color: tokens.colors.danger, marginTop: tokens.space.sm },
});