import { useCallback, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { FlashList } from "@shopify/flash-list";

import { Screen, LoadingState, ErrorCard, components } from "@/lib/uiKit";
import { hooksBag } from "@/lib/hooksBag";
import { useSession } from "@/lib/providers/SessionProvider";
import { tokens } from "@/lib/ui/tokens";

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

  const title = siteName?.trim() || "Location";

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
        <Stack.Screen options={{ title: "Reviews" }} />
        <LoadingState label="Loading reviews..." />
      </Screen>
    );
  }

  if (err) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Reviews" }} />
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
      <Stack.Screen options={{ title: "Community Reviews", headerTransparent: true }} />

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
