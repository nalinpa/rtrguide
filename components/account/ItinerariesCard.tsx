// components/account/ItinerariesCard.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { ChevronRight, Plus } from "lucide-react-native";

import { AppText } from "@/lib/uiKit";
import { useItineraries } from "@/lib/hooks/useItineraries";
import { tokens } from "@/lib/ui/tokens";
import { PLANNER } from "@/lib/constants/gameplay";
import { CreateItineraryModal } from "@/components/itinerary/CreateItineraryModal";
import { useSession } from "@/lib/providers/SessionProvider";
import { useEntitlementGate } from "@/lib/hooks/useEntitlementGate";
import { FULL_GUIDE_PRODUCT_ID } from "@/lib/constants/commerce";

function formatTripDates(startDate: string, endDate: string): string {
  const fmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
  if (!endDate || endDate === startDate) return fmt(startDate);
  return `${fmt(startDate)} — ${fmt(endDate)}`;
}

export function ItinerariesCard() {
  const { itineraries, error } = useItineraries();
  const { session } = useSession();
  const uid = session.status === "authed" ? session.uid : null;
  const { entitledProductIds, loading: entitlementsLoading } = useEntitlementGate(uid);
  const atLimit = itineraries.length >= PLANNER.MAX_ITINERARIES;
  const [isCreating, setIsCreating] = useState(false);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>MY ITINERARIES</Text>
        {itineraries.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{itineraries.length}</Text>
          </View>
        )}
      </View>

      {itineraries.length === 0 ? (
        <Text style={styles.emptyText}>No itineraries yet.</Text>
      ) : (
        <View style={styles.list}>
          {itineraries.map((itinerary, index) => (
            <TouchableOpacity
              key={itinerary.id}
              style={styles.row}
              onPress={() => router.push(`/(app)/(tabs)/itinerary/${itinerary.id}`)}
              activeOpacity={0.6}
            >
              <Text style={styles.index}>{String(index + 1).padStart(2, "0")}</Text>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {itinerary.title}
                </Text>
                <Text style={styles.rowDate}>{formatTripDates(itinerary.startDate, itinerary.endDate)}</Text>
              </View>
              <ChevronRight size={14} color={tokens.colors.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {error && (
        <AppText variant="label" style={[styles.errorText, { color: tokens.colors.danger }]}>
          {error}
        </AppText>
      )}

      {atLimit ? (
        <Text style={styles.limitText}>Up to {PLANNER.MAX_ITINERARIES} itineraries allowed.</Text>
      ) : (
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => {
            if (entitlementsLoading) return;
            setIsCreating(true);
          }}
          activeOpacity={0.6}
        >
          <Plus size={13} color={tokens.colors.accent} strokeWidth={2.5} />
          <Text style={styles.createBtnText}>New Itinerary</Text>
        </TouchableOpacity>
      )}

      <CreateItineraryModal
        visible={isCreating}
        locked={!entitledProductIds.has(FULL_GUIDE_PRODUCT_ID)}
        onClose={() => setIsCreating(false)}
        onCreated={() => setIsCreating(false)}
        showTemplateOption
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: tokens.space.md, paddingVertical: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 3,
    textTransform: "uppercase",
    color: tokens.colors.text2,
  },
  countBadge: {
    backgroundColor: tokens.colors.surf,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { fontSize: 10, fontWeight: "700", color: "#FFFFFF" },
  emptyText: { fontSize: 14, fontWeight: "400", color: tokens.colors.textMuted, marginBottom: 16 },
  list: { marginBottom: 16, gap: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.border,
  },
  index: { fontSize: 11, fontWeight: "700", color: tokens.colors.surf, letterSpacing: 1, width: 20 },
  rowContent: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 15, fontWeight: "600", color: tokens.colors.text, letterSpacing: -0.1 },
  rowDate: { fontSize: 12, fontWeight: "400", color: tokens.colors.text2, letterSpacing: 0.2 },
  errorText: { marginBottom: 12 },
  limitText: { fontSize: 12, fontWeight: "400", color: tokens.colors.textMuted, letterSpacing: 0.2 },
  createBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 4 },
  createBtnText: { fontSize: 13, fontWeight: "600", color: tokens.colors.accent, letterSpacing: 0.2 },
});