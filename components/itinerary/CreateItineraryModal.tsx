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
import { ITINERARY_TEMPLATES, defaultTemplateKey } from "@/lib/itineraryTemplates";
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

// react-native-ui-datepicker needs an explicit IANA timeZone to compute its
// calendar grid correctly — derived from the device rather than hardcoded,
// so it's correct for any user, not just NZ testers.
const DEVICE_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

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

  const templatesEnabled = showTemplateOption;

  useEffect(() => {
    if (visible) {
      setTitle("");
      setStartDate(tomorrow());
      setNumDays(locked ? 1 : 3);
      setSelectedTemplate(defaultTemplateKey(locked));
      setTemplateOpen(false);
      setShowCalendar(false);
      setErrorMsg(null);
    }
  }, [visible, locked]);

  const handleCreate = async () => {
    setErrorMsg(null);

    const resolvedTitle = title.trim() || "Rotorua Trip";
    const template = templatesEnabled
      ? ITINERARY_TEMPLATES.find((t) => t.key === selectedTemplate && (!locked || t.free))
      : undefined;
    if (locked && !template) {
      setErrorMsg("Premium — unlock to start a blank trip.");
      return;
    }
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
                style={styles.input}
                placeholder="Optional — defaults to Rotorua Trip"
                placeholderTextColor={tokens.colors.textMuted}
                value={title}
                onChangeText={setTitle}
                autoCapitalize="words"
                returnKeyType="done"
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
              {/* Always mounted (visibility toggled via style), not conditionally
                  rendered — react-native-ui-datepicker treats a fresh mount with
                  a defined timeZone as "the timezone just changed" (it compares
                  against its own usePrevious, which starts undefined) and fires
                  a synthetic onChange to report the resolved date. Conditionally
                  rendering this on showCalendar meant every single open was a
                  fresh mount, so that synthetic onChange fired every time and
                  immediately closed the sheet we'd just opened. Mounting once
                  and toggling display keeps its internal state alive across
                  opens, so the synthetic-change guard only trips on the app's
                  first render (while this is still hidden, so it's harmless). */}
              <View style={[styles.calendarWrapper, !showCalendar && styles.hidden]}>
                <DateTimePicker
                  mode="single"
                  timeZone={DEVICE_TIME_ZONE}
                  date={startDate}
                  onChange={() => {
                    // Real selection now happens in the components.Day
                    // override below — this stays as a no-op fallback for
                    // any other internal path that might still call it
                    // (e.g. month/year navigation), so it's never left
                    // undefined.
                  }}
                  components={{
                    // react-native-ui-datepicker's own onChange/onSelectDate
                    // pipeline (getStartOfDay -> dayjs.tz(...) -> onChange)
                    // consistently resolved to the day *after* whatever was
                    // actually tapped once timeZone was set to Pacific/Auckland
                    // (confirmed: a tapped cell producing a raw UTC instant
                    // that, correctly converted to NZ time, was already
                    // midnight the next day — the bug is in the library's own
                    // date construction, not in how we read its result).
                    // day.date here is the plain dayjs instance the library
                    // builds the cell's *label* from too (both come from the
                    // same loop variable in generateCalendarDay, utils.js),
                    // so reading year/month/date straight off it is
                    // guaranteed to match what's on screen — no further
                    // timezone reprocessing to go wrong. The Pressable here
                    // is nested inside the library's own cell Pressable, but
                    // RN's touch responder system awards the tap to the
                    // innermost one, so the library's own (buggy) onPress
                    // never fires.
                    Day: (day: any) => {
                      // day.isSelected/isToday (library-computed) go through
                      // areDatesOnSameDay -> plain dayjs(startDate).format(...),
                      // the same broken re-interpretation that caused the date
                      // value bug — comparing our own known-good startDate
                      // fields directly against day.date's own fields sidesteps
                      // it the same way the tap handler below does.
                      const d = day.date;
                      const isSelected =
                        d.year() === startDate.getFullYear() &&
                        d.month() === startDate.getMonth() &&
                        d.date() === startDate.getDate();
                      const now = new Date();
                      const isToday =
                        d.year() === now.getFullYear() && d.month() === now.getMonth() && d.date() === now.getDate();
                      return (
                        <TouchableOpacity
                          disabled={day.isDisabled}
                          activeOpacity={0.7}
                          style={[calendarDayStyles.cell, isSelected && calendarDayStyles.cellSelected]}
                          onPress={() => {
                            setStartDate(new Date(d.year(), d.month(), d.date()));
                            setShowCalendar(false);
                          }}
                        >
                          <AppText
                            style={[
                              calendarDayStyles.label,
                              !day.isCurrentMonth && calendarDayStyles.labelOutside,
                              isToday && !isSelected && calendarDayStyles.labelToday,
                              isSelected && calendarDayStyles.labelSelected,
                              day.isDisabled && calendarDayStyles.labelDisabled,
                            ]}
                          >
                            {day.text}
                          </AppText>
                        </TouchableOpacity>
                      );
                    },
                  }}
                  minDate={new Date()}
                  styles={{
                    // day/selected/today_label are unused now — the
                    // components.Day override above fully replaces day-cell
                    // rendering (calendarDayStyles handles that look).
                    month_selector_label: { color: tokens.colors.text },
                    year_selector_label: { color: tokens.colors.text },
                    weekday_label: { color: tokens.colors.text2 },
                  }}
                />
              </View>

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
                        ? "Blank"
                        : (ITINERARY_TEMPLATES.find((t) => t.key === selectedTemplate)?.label ?? "Blank")}
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
                        [
                          { key: null, label: "Blank", description: "Start with a blank trip", free: !locked },
                          ...ITINERARY_TEMPLATES,
                        ]
                      ).map((opt) => {
                        const active = selectedTemplate === opt.key;
                        const isLockedOut = locked && !opt.free;
                        return (
                          <TouchableOpacity
                            key={String(opt.key)}
                            style={styles.dropdownOption}
                            onPress={() => {
                              if (isLockedOut) return;
                              setSelectedTemplate(opt.key);
                              setTemplateOpen(false);
                            }}
                            activeOpacity={isLockedOut ? 1 : 0.7}
                          >
                            <View style={styles.dropdownOptionText}>
                              <AppText
                                style={[
                                  styles.dropdownOptionLabel,
                                  active && styles.dropdownOptionLabelActive,
                                  isLockedOut && styles.dropdownOptionLabelLocked,
                                ]}
                              >
                                {opt.label}
                              </AppText>
                              <AppText style={[styles.dropdownOptionSub, isLockedOut && styles.dropdownOptionLabelLocked]}>
                                {opt.description}
                              </AppText>
                            </View>
                            {isLockedOut ? (
                              <View style={styles.premiumBadge}>
                                <Lock size={11} color={tokens.colors.textMuted} />
                                <AppText style={styles.premiumBadgeText}>Premium</AppText>
                              </View>
                            ) : (
                              active && <Check size={16} color={tokens.colors.accent} strokeWidth={2.5} />
                            )}
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

              <AppButton
                variant="primary"
                onPress={handleCreate}
                loading={isSaving}
                loadingLabel="Creating..."
                fullWidth
                style={styles.createBtn}
              >
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
  hidden: { display: "none" },
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
  dropdownOptionLabelLocked: { color: tokens.colors.textMuted },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: tokens.colors.bgElevated,
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  premiumBadgeText: { fontSize: 10, fontWeight: "700", color: tokens.colors.textMuted, letterSpacing: 0.3 },
  errorText: { fontSize: 12, color: tokens.colors.danger, marginTop: tokens.space.sm },
  createBtn: { marginTop: tokens.space.md },
});

const calendarDayStyles = StyleSheet.create({
  cell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cellSelected: { backgroundColor: tokens.colors.accent },
  label: { fontSize: 14, color: tokens.colors.text },
  labelOutside: { color: tokens.colors.textMuted },
  labelToday: { color: tokens.colors.accent, fontWeight: "700" },
  labelSelected: { color: "#FFFFFF", fontWeight: "700" },
  labelDisabled: { color: tokens.colors.textMuted, opacity: 0.5 },
});