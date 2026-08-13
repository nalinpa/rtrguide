import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Animated, View, StyleSheet, Alert, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack as ExpoStack, router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { ArrowLeft } from "lucide-react-native";

import { LoadingState, ErrorCard, Stack, AppText, components } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { hooksBag } from "@/lib/hooksBag";
import { useSession } from "@/lib/providers/SessionProvider";
import { useSavedSites } from "@/lib/hooks/useSavedSites";
import { useItineraries } from "@/lib/hooks/useItineraries";
import { PLANNER } from "@/lib/constants/gameplay";
import { CreateItineraryModal } from "@/components/itinerary/CreateItineraryModal";
import { AddToTripModal } from "@/components/itinerary/AddToTripModal";
import { SiteHero, SITE_HERO_HEIGHT } from "@/components/site/detail/SiteHero";
import { SiteActionsBar } from "@/components/site/detail/SiteActionsBar";
import { FULL_GUIDE_PRODUCT_ID } from "@/lib/constants/commerce";

const MAX_ACCURACY_METERS = 50;

export default function SiteDetailRoute() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();
  const id = String(siteId);

  const { session } = useSession();
  const uid = session.status === "authed" ? session.uid : null;

  const { entitledProductIds, loading: entitlementsLoading } = hooksBag.useEntitlements(uid);

  const {
    completedLocationIds,
    pendingLocationIds,
    sharedLocationIds,
    loading: compsLoading,
  } = hooksBag.useMyCompletions(uid);

  const isCompleted = completedLocationIds.has(id);
  const isSyncing = pendingLocationIds.has(id);
  const hasShareBonus = sharedLocationIds.has(id);

  const { location: site, loading: entityLoading, err: entityErr } = hooksBag.useLocation(id);
  const { loc: userCoords, err: locErr, refresh: refreshLocation } = hooksBag.useUserLocation();
  const locStatus = locErr ? "denied" : userCoords ? "granted" : "unknown";

  const gate = hooksBag.useGPSGate(site, userCoords);

  const {
    avgRating,
    ratingCount,
    myRating,
    myText: myReviewText,
    saving: reviewsSaving,
    saveReview: saveReviewToDb,
  } = hooksBag.useLocationReviewsSummary(uid, id, { extraLoading: session.status === "loading" });

  const { savedSiteIds, toggleSavedSite } = useSavedSites();
  const isSaved = savedSiteIds.has(id);

  const { itineraries } = useItineraries();
  const [showTripChoice, setShowTripChoice] = useState(false);
  const [isCreatingItinerary, setIsCreatingItinerary] = useState(false);
  const [isAddingToTrip, setIsAddingToTrip] = useState(false);
  const [pendingItineraryId, setPendingItineraryId] = useState<string | null>(null);

  const [err, setErr] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const { drafts, setDraft, clearDraft } = hooksBag.useDraftsStore();
  const currentDraft = drafts[id] || { rating: null, text: "" };

  const { isTracking, targetId, targetName, startTracking, stopTracking, triggerSuccessUI } =
    hooksBag.useTrackingStore();
  const isTargetingThis = isTracking && targetId === id;
  const isTrackingSomethingElse = isTracking && !!targetId && targetId !== id;
  const handleStartTracking = useCallback(() => {
    startTracking(id, site?.name ?? "");
  }, [id, site?.name, startTracking]);

  const { checkIn } = hooksBag.useCheckIn();
  const checkInInFlight = useRef(false);

  const handleCheckIn = async () => {
    if (checkInInFlight.current || !uid || !site || !userCoords) return;
    if (!gate.inRange) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErr("GPS wasn't quite right — try checking in again.");
      return;
    }
    checkInInFlight.current = true;
    try {
      const result = await checkIn({
        uid,
        locationId: id,
        locationName: site.name,
        coords: [userCoords.coords.latitude, userCoords.coords.longitude],
        accuracyMeters: userCoords.coords.accuracy ?? null,
        gate: {
          inRange: gate.inRange,
          checkpointId: gate.checkpointId,
          checkpointLabel: gate.checkpointLabel,
          checkpointLat: gate.checkpointLat,
          checkpointLng: gate.checkpointLng,
        },
      });
      if (result.ok === true || result.ok === "queued") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        triggerSuccessUI(site.name, id);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setErr("Couldn't save your visit. Please try again.");
      }
    } finally {
      checkInInFlight.current = false;
    }
  };

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && (!userCoords || (gate.accuracyMeters ?? 0) > MAX_ACCURACY_METERS)) {
        if (locStatus !== "denied") refreshLocation();
      }
    });
    return () => sub.remove();
  }, [userCoords, gate.accuracyMeters, locStatus, refreshLocation]);

  useEffect(() => {
    if (!err) return;
    const timeoutId = setTimeout(() => setErr(""), 10000);
    return () => clearTimeout(timeoutId);
  }, [err]);

  const scrollY = useRef(new Animated.Value(0)).current;
  const imageTranslateY = scrollY.interpolate({
    inputRange: [0, SITE_HERO_HEIGHT],
    outputRange: [0, -(SITE_HERO_HEIGHT / 2)],
    extrapolate: "clamp",
  });

  if (entityLoading || compsLoading || session.status === "loading" || entitlementsLoading) {
    return (
      <View style={styles.container}>
        <LoadingState label="Loading..." />
      </View>
    );
  }

  if (entityErr || !site) {
    return (
      <View style={styles.container}>
        <ErrorCard
          title="Location Not Found"
          message={entityErr || "Could not find this Location."}
          action={{ label: "Go Back", onPress: () => router.replace("/(app)/(tabs)/sites") }}
        />
      </View>
    );
  }

  const isLocked = !!site.isPremium && !entitledProductIds.has(FULL_GUIDE_PRODUCT_ID);

  if (isLocked) {
    return (
      <View style={styles.container}>
        <ExpoStack.Screen options={{ headerShown: false }} />

        <View style={styles.heroWrap}>
          <SiteHero imageUrl={site.imageUrl} imageThumbnailUrl={site.imageThumbnailUrl} />
        </View>

        <View style={{ marginTop: SITE_HERO_HEIGHT - 32 }}>
          <View style={styles.sheet}>
            <View style={styles.dragHandle} />
            <Stack gap="md" style={styles.content}>
              <AppText variant="h1">{site.name}</AppText>
              <components.RequirePurchaseCard
                productId={FULL_GUIDE_PRODUCT_ID}
                entitledProductIds={entitledProductIds}
                title="Unlock This Location"
                message="This is a premium location. Unlock the full guide to see details, check in, and leave a review."
                onBuy={() => Alert.alert("Unlock Full Guide", "Purchasing from the app is coming soon.")}
              >
                {null}
              </components.RequirePurchaseCard>
            </Stack>
          </View>
        </View>

        <SafeAreaView style={styles.backButtonWrap} pointerEvents="box-none">
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ArrowLeft color="#FFFFFF" size={22} />
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ExpoStack.Screen options={{ headerShown: false }} />

      <Animated.View style={[styles.heroWrap, { transform: [{ translateY: imageTranslateY }] }]}>
        <SiteHero imageUrl={site.imageUrl} imageThumbnailUrl={site.imageThumbnailUrl} />
      </Animated.View>

      <Animated.ScrollView
        style={StyleSheet.absoluteFill}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: SITE_HERO_HEIGHT - 32 }} />
        <View style={styles.sheet}>
          <View style={styles.dragHandle} />

          <Stack gap="md" style={styles.content}>
            <AppText variant="h1">{site.name}</AppText>
            <AppText variant="body" status="hint">
              {site.description}
            </AppText>

            {err && <ErrorCard status="warning" title="Check-in Issue" message={err} />}

            <components.ReviewsSummaryCard
              ratingCount={ratingCount}
              avgRating={avgRating}
              onViewAll={() => router.push(`/(app)/(tabs)/sites/${id}/reviews`)}
              isCompleted={isCompleted}
              hasUserReviewed={!!myRating}
              onAddReview={() => setReviewOpen(true)}
            />

            <SiteActionsBar
              id={id}
              title={site.name}
              completed={isCompleted}
              completionMode="gps"
              isSyncing={isSyncing}
              locStatus={locStatus}
              hasLoc={!!userCoords}
              canCheckIn={gate.inRange}
              hasReview={!!myRating}
              myReviewRating={myRating ?? undefined}
              myReviewText={myReviewText ?? undefined}
              onOpenReview={() => setReviewOpen(true)}
              onCheckIn={() => {
                startTracking(id, site.name);
                handleCheckIn();
              }}
              shareBonus={hasShareBonus}
              onShareBonus={() =>
                router.push({ pathname: "/share-frame", params: { entityId: id, entityName: site.name } })
              }
              isSaved={isSaved}
              onToggleSave={() => {
                if (!isSaved && !entitledProductIds.has(FULL_GUIDE_PRODUCT_ID)) {
                  Alert.alert("Premium Feature", "Saving sites requires the full guide unlock.");
                  return;
                }
                toggleSavedSite({ siteId: id, isSaving: !isSaved });
              }}
            />

            <Pressable
              style={itineraryStyles.button}
              onPress={() => {
                if (!entitledProductIds.has(FULL_GUIDE_PRODUCT_ID)) {
                  Alert.alert("Premium Feature", "Building itineraries requires the full guide unlock.");
                  return;
                }
                if (itineraries.length === 0) {
                  setIsCreatingItinerary(true);
                } else if (itineraries.length < PLANNER.MAX_ITINERARIES) {
                  setShowTripChoice(true);
                } else {
                  setIsAddingToTrip(true);
                }
              }}
            >
              <AppText style={itineraryStyles.text}>+ Add to Itinerary</AppText>
            </Pressable>
          </Stack>
        </View>
      </Animated.ScrollView>

      <SafeAreaView style={styles.backButtonWrap} pointerEvents="box-none">
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft color="#FFFFFF" size={22} />
        </Pressable>
      </SafeAreaView>

      <components.ReviewModal
        visible={reviewOpen}
        saving={reviewsSaving}
        draftRating={currentDraft.rating}
        draftText={currentDraft.text}
        onChangeRating={(val) => setDraft(id, val, currentDraft.text)}
        onChangeText={(text) => setDraft(id, currentDraft.rating, text)}
        onClose={() => setReviewOpen(false)}
        onSave={async () => {
          const res = await saveReviewToDb({
            locationId: id,
            reviewRating: currentDraft.rating!,
            reviewText: currentDraft.text,
          });
          if (res.ok) {
            clearDraft(id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setReviewOpen(false);
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
        }}
      />

      <components.TripChoiceSheet
        visible={showTripChoice}
        onClose={() => setShowTripChoice(false)}
        onAddToExisting={() => {
          setShowTripChoice(false);
          setIsAddingToTrip(true);
        }}
        onCreateNew={() => {
          setShowTripChoice(false);
          setIsCreatingItinerary(true);
        }}
      />

      <CreateItineraryModal
        visible={isCreatingItinerary}
        onClose={() => setIsCreatingItinerary(false)}
        onCreated={(id) => {
          setIsCreatingItinerary(false);
          setPendingItineraryId(id);
          setIsAddingToTrip(true);
        }}
      />

      <AddToTripModal
        site={
          isAddingToTrip
            ? { id: site.id, name: site.name, imageUrl: site.imageThumbnailUrl ?? site.imageUrl ?? undefined }
            : null
        }
        initialItineraryId={pendingItineraryId}
        onClose={() => {
          setIsAddingToTrip(false);
          setPendingItineraryId(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.bgBase },
  heroWrap: { position: "absolute", top: 0, left: 0, right: 0 },
  sheet: {
    backgroundColor: tokens.colors.bgBase,
    borderTopLeftRadius: tokens.radius.lg,
    borderTopRightRadius: tokens.radius.lg,
    paddingBottom: 120,
    minHeight: 600,
  },
  dragHandle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.colors.borderStrong,
    opacity: 0.5,
    alignSelf: "center",
    marginTop: 14,
    marginBottom: 6,
  },
  content: { paddingHorizontal: tokens.space.md, paddingTop: tokens.space.sm },
  backButtonWrap: { position: "absolute", top: 0, left: 0, right: 0 },
  backButton: {
    margin: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(36,26,18,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
});

const itineraryStyles = StyleSheet.create({
  button: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    paddingVertical: 14,
    alignItems: "center",
  },
  text: { color: tokens.colors.text2, fontWeight: "700" },
});
