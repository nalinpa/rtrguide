import { useCallback, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { FlashList } from "@shopify/flash-list";

import { Screen, LoadingState, ErrorCard, components } from "@/lib/uiKit";
import { hooksBag } from "@/lib/hooksBag";
import { useSession } from "@/lib/providers/SessionProvider";
import { tokens } from "@/lib/ui/tokens";

// Module-level on purpose: <Stack.Screen> calls navigation.setOptions whenever the
// options object's identity changes, so an inline literal re-fires it every render —
// that's what hit "Maximum update depth exceeded" on the Map tab.
const PLAIN_OPTIONS = { title: "Reviews" };
const LIST_OPTIONS = { title: "Community Reviews", headerTransparent: true };

function SiteReviewOptionsMenu({
  reviewId,
  authorId,
  authorName,
}: {
  reviewId: string;
  authorId: string;
  authorName: string;
}) {
  const { session } = useSession();
  const currentUid = session.status === "authed" ? session.uid : null;
  const report = hooksBag.useReportContent();
  const block = hooksBag.useBlockUser(currentUid);

  return (
    <components.ReviewOptionsMenu
      reviewId={reviewId}
      authorId={authorId}
      authorName={authorName}
      currentUserId={currentUid}
      onReport={(args) => report.mutate({ reviewId: args.reviewId, authorId: args.authorId })}
      onBlock={(args) => block.mutate(args)}
    />
  );
}

export default function SiteReviewsPage() {
  const { siteId, siteName } = useLocalSearchParams<{
    siteId: string;
    siteName?: string;
  }>();
  const id = String(siteId);

  const { session } = useSession();
  const currentUid = session.status === "authed" ? session.uid : null;

  // The param isn't set when arriving from the site screen or a deep link, so fall back
  // to the site itself rather than showing a placeholder title.
  const { location } = hooksBag.useLocation(id);
  const title = siteName?.trim() || location?.name || "Reviews";

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(`/(app)/(tabs)/sites/${id}`);
  }, [id]);

  const { loading, err, reviews, refresh } = hooksBag.usePublicReviews(id);
  const { avgRating, ratingCount } = hooksBag.useLocationReviewsSummary(currentUid, id);
  const { data: blockedUids = [] } = hooksBag.useBlockedUsers(currentUid);

  const summary = useMemo(
    () => ({
      avg: avgRating == null ? null : Math.round(Number(avgRating) * 10) / 10,
      count: ratingCount,
    }),
    [avgRating, ratingCount],
  );

  const safeReviews = useMemo(() => {
    if (!reviews) return [];
    return reviews.filter((review) => !blockedUids.includes(review.userId));
  }, [reviews, blockedUids]);

  if (loading) {
    return (
      <Screen>
        <Stack.Screen options={PLAIN_OPTIONS} />
        <LoadingState label="Loading reviews..." />
      </Screen>
    );
  }

  // Only block on err when there's nothing cached to show — a background
  // refetch failing offline shouldn't hide reviews we already have.
  if (err && !reviews?.length) {
    return (
      <Screen>
        <Stack.Screen options={PLAIN_OPTIONS} />
        <ErrorCard
          title="Couldn't load reviews"
          message={err}
          action={{ label: "Go Back", onPress: goBack }}
          secondaryAction={{ label: "Try Again", onPress: refresh }}
        />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <Stack.Screen options={LIST_OPTIONS} />

      <FlashList
        data={safeReviews}
        keyExtractor={(item) => item.id}
        // @ts-ignore
        estimatedItemSize={100}
        renderItem={({ item }) => (
          <View style={styles.itemWrapper}>
            <components.ReviewListItem
              reviewId={item.id}
              authorId={item.userId}
              authorName={item.userName}
              rating={item.rating}
              text={item.text}
              createdAt={item.reviewCreatedAt}
              variant="card"
              optionsMenu={SiteReviewOptionsMenu}
            />
          </View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerWrapper}>
            <components.ReviewsHeader
              title={title}
              avg={summary.avg}
              count={summary.count}
              onBack={goBack}
              emptyLabel="No community data available yet."
              showDivider={true}
              backLabel="Back"
            />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.itemWrapper}>
            <components.ReviewsEmptyState onBack={goBack} onRetry={refresh} />
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingTop: 10,
    paddingBottom: 40,
  },
  headerWrapper: {
    paddingHorizontal: 16,
    marginBottom: tokens.space.lg,
  },
  itemWrapper: {
    paddingHorizontal: 16,
    marginBottom: tokens.space.md,
  },
});
