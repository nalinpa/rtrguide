import { useEffect, useState } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Calendar, ChevronRight, LogIn, Plus } from "lucide-react-native";

import { Screen, LoadingState, ErrorCard, CardShell, Stack, Row, AppText, AppButton, components } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { useSession } from "@/lib/providers/SessionProvider";
import { useItineraries } from "@/lib/hooks/useItineraries";
import { useEntitlementGate } from "@/lib/hooks/useEntitlementGate";
import { PLANNER } from "@/lib/constants/gameplay";
import { FULL_GUIDE_PRODUCT_ID } from "@/lib/constants/commerce";
import { CreateItineraryModal } from "@/components/itinerary/CreateItineraryModal";

function formatTripDates(startDate: string, endDate: string): string {
  const fmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
  if (!endDate || endDate === startDate) return fmt(startDate);
  return `${fmt(startDate)} — ${fmt(endDate)}`;
}

export default function ItineraryListPage() {
  const { session } = useSession();
  const uid = session.status === "authed" ? session.uid : null;
  const { entitledProductIds, loading: entitlementsLoading } = useEntitlementGate(uid);
  const isEntitled = entitledProductIds.has(FULL_GUIDE_PRODUCT_ID);
  const { itineraries, loading, error, refetch } = useItineraries();
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (itineraries.length === 1) {
      router.replace(`/(app)/(tabs)/itinerary/${itineraries[0].id}`);
    }
  }, [itineraries]);

  if (session.status === "guest") {
    return (
      <Screen>
        <Stack gap="lg" style={styles.paddedSection}>
          <AppText variant="h1">Plans</AppText>
          <CardShell status="surf" style={styles.signInCard} onPress={() => router.push("/(auth)/login")}>
            <Stack gap="md" align="center">
              <Row gap="sm" align="center">
                <LogIn size={28} color={tokens.colors.accent} />
                <AppText variant="h1">Sign In to Plan a Trip</AppText>
              </Row>
              <AppText variant="body" status="hint" style={styles.centerText}>
                Create an account to build and save a Rotorua itinerary.
              </AppText>
              <AppButton variant="primary" size="lg" fullWidth onPress={() => router.push("/(auth)/login")}>
                Sign In
              </AppButton>
            </Stack>
          </CardShell>
        </Stack>
      </Screen>
    );
  }

  if (session.status === "loading" || loading || entitlementsLoading) {
    return (
      <Screen>
        <LoadingState label="Loading your trips..." />
      </Screen>
    );
  }

  if (error && itineraries.length === 0) {
    return (
      <Screen>
        <ErrorCard title="Couldn't load your trips" message={error} action={{ label: "Try Again", onPress: () => refetch() }} />
      </Screen>
    );
  }

  if (itineraries.length === 0) {
    return (
      <>
        <components.EmptyItineraryState
          onCreateNew={() => setIsCreating(true)}
          onBrowse={() => router.push("/(app)/(tabs)/sites")}
          description="Create a trip and start adding Rotorua's sites, walks, and hidden gems to build your perfect itinerary."
          browseLabel="Explore Places to Visit"
        />
        <CreateItineraryModal
          visible={isCreating}
          locked={!isEntitled}
          onClose={() => setIsCreating(false)}
          onCreated={(id) => {
            setIsCreating(false);
            router.replace(`/(app)/(tabs)/itinerary/${id}`);
          }}
          showTemplateOption
        />
      </>
    );
  }

  // itineraries.length === 1 redirects via the effect above — this only
  // renders the picker when there's more than one trip.
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <AppText variant="h1">My Trips</AppText>
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {itineraries.map((itin) => (
          <TouchableOpacity
            key={itin.id}
            style={styles.tripCard}
            onPress={() => router.push(`/(app)/(tabs)/itinerary/${itin.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.tripCardIcon}>
              <Calendar size={22} color={tokens.colors.accent} />
            </View>
            <View style={styles.tripCardInner}>
              <AppText style={styles.tripCardTitle} numberOfLines={1}>
                {itin.title}
              </AppText>
              <AppText style={styles.tripCardMeta}>
                {formatTripDates(itin.startDate, itin.endDate)}
                {itin.days?.length ? ` · ${itin.days.length} ${itin.days.length === 1 ? "day" : "days"}` : ""}
              </AppText>
            </View>
            <ChevronRight size={20} color={tokens.colors.text2} />
          </TouchableOpacity>
        ))}

        {isEntitled && itineraries.length < PLANNER.MAX_ITINERARIES && (
          <TouchableOpacity style={styles.tripCardCreate} onPress={() => setIsCreating(true)} activeOpacity={0.7}>
            <Plus size={18} color={tokens.colors.accent} />
            <AppText style={styles.tripCardCreateText}>Create new trip</AppText>
          </TouchableOpacity>
        )}
      </ScrollView>

      <CreateItineraryModal
        visible={isCreating}
        locked={!isEntitled}
        onClose={() => setIsCreating(false)}
        onCreated={(id) => {
          setIsCreating(false);
          if (id) router.replace(`/(app)/(tabs)/itinerary/${id}`);
        }}
        showTemplateOption
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.colors.bgBase },
  paddedSection: { paddingHorizontal: 16, paddingTop: 12 },
  header: { paddingHorizontal: tokens.space.md, paddingTop: tokens.space.md, paddingBottom: 16 },
  body: { padding: tokens.space.md, gap: 14, paddingBottom: 40 },
  signInCard: { paddingVertical: tokens.space.xl, paddingHorizontal: tokens.space.lg },
  centerText: { textAlign: "center" },
  tripCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: tokens.colors.bgCard,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  tripCardIcon: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.accentDim,
    alignItems: "center",
    justifyContent: "center",
  },
  tripCardInner: { flex: 1, gap: 5 },
  tripCardTitle: { fontSize: 18, fontWeight: "700", color: tokens.colors.text },
  tripCardMeta: { fontSize: 14, color: tokens.colors.text2 },
  tripCardCreate: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: tokens.radius.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: tokens.colors.accent,
    marginTop: 6,
  },
  tripCardCreateText: { fontSize: 15, fontWeight: "600", color: tokens.colors.accent },
});