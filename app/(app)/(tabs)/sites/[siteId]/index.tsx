import { useCallback, useRef, useState } from "react";
import { Animated, View, StyleSheet, Alert, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack as ExpoStack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { ArrowLeft, Globe } from "lucide-react-native";

import { LoadingState, ErrorCard, Stack, Row, AppText, components } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { hooksBag, QUERY_KEY_PREFIX } from "@/lib/hooksBag";
import { useEntitlementGate } from "@/lib/hooks/useEntitlementGate";
import { usePurchaseContext } from "@/lib/iap/PurchaseProvider";
import { PurchasePendingBanner } from "@/components/purchase/PurchasePendingBanner";
import { useSession } from "@/lib/providers/SessionProvider";
import { useSavedSites } from "@/lib/hooks/useSavedSites";
import { useItineraries } from "@/lib/hooks/useItineraries";
import { PLANNER } from "@/lib/constants/gameplay";
import { CreateItineraryModal } from "@/components/itinerary/CreateItineraryModal";
import { AddToTripModal } from "@/components/itinerary/AddToTripModal";
import { PremiumFeatureModal } from "@/components/itinerary/PremiumFeatureModal";
import { SiteHero, SITE_HERO_HEIGHT } from "@/components/site/detail/SiteHero";
import { SiteQuickActions } from "@/components/site/detail/SiteActionsBar";
import { FULL_GUIDE_PRODUCT_ID } from "@/lib/constants/commerce";

export default function SiteDetailRoute() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();
  const id = String(siteId);

  const { session } = useSession();
  const uid = session.status === "authed" ? session.uid : null;

  const { entitledProductIds, loading: entitlementsLoading } = useEntitlementGate(uid);
  const { requestBuy, pendingProductId } = usePurchaseContext();

  const { sharedLocationIds } = hooksBag.useMyCompletions(uid);
  const hasShareBonus = sharedLocationIds.has(id);

  const { location: site, loading: entityLoading, err: entityErr } = hooksBag.useLocation(id);

  // useLocation caches for 14 days with no refetch-on-focus (see @blacksands/hooks),
  // so force a revalidation whenever this screen regains focus.
  const queryClient = useQueryClient();
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY_PREFIX, "location", id] });
    }, [queryClient, id]),
  );

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
  const [showPremiumAdd, setShowPremiumAdd] = useState(false);

  const [reviewOpen, setReviewOpen] = useState(false);
  const { drafts, setDraft, clearDraft } = hooksBag.useDraftsStore();
  const currentDraft = drafts[id] || { rating: null, text: "" };

  const { reviewCount } = hooksBag.useMyReviews(uid);
  const preReviewCountRef = useRef(reviewCount);
  preReviewCountRef.current = reviewCount;
  const { requestReview } = hooksBag.useReviewPrompt();

  const handleDirections = useCallback(() => {
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${site?.lat},${site?.lng}`).catch(() => {
      Alert.alert("Couldn't Open Maps", "No maps app is available to show directions.");
    });
  }, [site?.lat, site?.lng]);

  const handleOpenWebsite = useCallback((raw: string) => {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      Alert.alert("Invalid Link", "This website link is not valid.");
      return;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      Alert.alert("Invalid Link", "This website link is not valid.");
      return;
    }
    url.searchParams.set("utm_source", "blacksands.app");
    url.searchParams.set("utm_medium", "rotorua app");
    url.searchParams.set("utm_campaign", "ios_link");
    Linking.openURL(url.toString()).catch(() => {
      Alert.alert("Couldn't Open Link", "No browser is available to open this website.");
    });
  }, []);

  const scrollY = useRef(new Animated.Value(0)).current;
  const imageTranslateY = scrollY.interpolate({
    inputRange: [0, SITE_HERO_HEIGHT],
    outputRange: [0, -(SITE_HERO_HEIGHT / 2)],
    extrapolate: "clamp",
  });

  if (entityLoading || session.status === "loading" || entitlementsLoading) {
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
              <AppText variant="h1" style={styles.blurredTitle}>
                {site.name}
              </AppText>
              {pendingProductId === FULL_GUIDE_PRODUCT_ID ? (
                <PurchasePendingBanner />
              ) : (
                <components.RequirePurchaseCard
                  productId={FULL_GUIDE_PRODUCT_ID}
                  entitledProductIds={entitledProductIds}
                  title="Unlock This Location"
                  message="This is a premium location. Unlock the full guide to see details and leave a review."
                  onBuy={() => requestBuy(FULL_GUIDE_PRODUCT_ID)}
                >
                  {null}
                </components.RequirePurchaseCard>
              )}
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

            {site.price && (
              <AppText variant="body" style={{ marginTop: -10 }}>
                {site.price}
              </AppText>
            )}

            <SiteQuickActions
              onDirections={handleDirections}
              onOpenReview={() => setReviewOpen(true)}
              hasReview={!!myRating}
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

            <AppText variant="body" status="hint">
              {site.description}
            </AppText>

            {site.website && (
              <Pressable onPress={() => handleOpenWebsite(site.website!)} style={styles.websiteChip}>
                <Row gap="xs" align="center">
                  <Globe size={20} color="#FFFFFF" />
                  <AppText variant="body" style={styles.websiteChipText}>
                    Visit Website
                  </AppText>
                </Row>
              </Pressable>
            )}

            <components.ReviewsSummaryCard
              ratingCount={ratingCount}
              avgRating={avgRating}
              onViewAll={() => router.push(`/(app)/(tabs)/sites/${id}/reviews`)}
              isCompleted={true}
              hasUserReviewed={!!myRating}
              onAddReview={() => setReviewOpen(true)}
            />

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

      <SafeAreaView style={styles.itineraryFloatingWrap} pointerEvents="box-none">
        <Pressable
          style={itineraryStyles.button}
          onPress={() => {
            if (!entitledProductIds.has(FULL_GUIDE_PRODUCT_ID)) {
              setShowPremiumAdd(true);
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
            if (preReviewCountRef.current === 0) requestReview();
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

      <PremiumFeatureModal
        visible={showPremiumAdd}
        onClose={() => setShowPremiumAdd(false)}
        title="Building itineraries is a Premium feature"
        message="Unlock the full guide to add places and plan your Rotorua trip."
        onBuy={() => {
          setShowPremiumAdd(false);
          requestBuy(FULL_GUIDE_PRODUCT_ID);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.bgBase },
  // ponytail: textShadow blur, no expo-blur dep. Android renders it softer than iOS — swap for BlurView if that's not enough.
  blurredTitle: {
    color: "transparent",
    textShadowColor: tokens.colors.text,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
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
  websiteChip: {
    flexDirection: "row",
    alignSelf: "center",
    borderRadius: 100,
    backgroundColor: tokens.colors.surf,
    paddingVertical: 16,
    paddingHorizontal: 28,
    marginTop: 8,
    shadowColor: tokens.colors.surf,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  websiteChipText: { color: "#FFFFFF", fontWeight: "700", fontSize: 18 },
  itineraryFloatingWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: tokens.space.md,
    paddingTop: 12,
  },
});

const itineraryStyles = StyleSheet.create({
  button: {
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.accent,
    paddingVertical: 20,
    alignItems: "center",
    shadowColor: "#241A12",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  text: { color: "#FFFFFF", fontWeight: "700" },
});
