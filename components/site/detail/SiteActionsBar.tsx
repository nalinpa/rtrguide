// components/site/detail/SiteActionsBar.tsx
import { View, StyleSheet } from "react-native";
import { MessageSquarePlus, Camera, Heart } from "lucide-react-native";

import { AppText, AppButton, RatingStars, Row, Stack } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";

type SiteActionsBarProps = {
  hasReview: boolean;
  myReviewRating?: number;
  myReviewText?: string;
  onOpenReview: () => void;
  onShareBonus: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
};

export function SiteActionsBar({
  hasReview,
  myReviewRating,
  myReviewText,
  onOpenReview,
  onShareBonus,
  isSaved,
  onToggleSave,
}: SiteActionsBarProps) {
  return (
    <Stack gap="md">
      <Row justify="flex-end">
        <AppButton variant={isSaved ? "success" : "ghost"} size="sm" icon={Heart} onPress={onToggleSave}>
          {isSaved ? "Saved" : "Save"}
        </AppButton>
      </Row>

      <View style={styles.card}>
        <Stack gap="lg">
          <View style={styles.innerBox}>
            <Stack gap="sm">
              <Row justify="space-between" align="center">
                <Row gap="xs" align="center">
                  <MessageSquarePlus size={15} color={tokens.colors.accent} />
                  <AppText variant="label">Your Experience</AppText>
                </Row>
                {hasReview && <RatingStars rating={myReviewRating ?? 0} size={14} />}
              </Row>
              {!hasReview ? (
                <AppButton variant="ghost" size="sm" onPress={onOpenReview}>
                  {"+ Log your review & rating"}
                </AppButton>
              ) : (
                <AppText style={styles.reviewText}>
                  {`"${myReviewText?.trim() || "No written log provided."}"`}
                </AppText>
              )}
            </Stack>
          </View>

          <Stack gap="sm">
            <AppText variant="label">Share</AppText>
            <AppButton variant="primary" onPress={onShareBonus} icon={Camera}>
              Share a Photo
            </AppButton>
          </Stack>
        </Stack>
      </View>
    </Stack>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bgCard,
    padding: tokens.space.md,
  },
  innerBox: {
    backgroundColor: tokens.colors.bgSurface,
    borderRadius: tokens.radius.md,
    padding: tokens.space.sm,
  },
  reviewText: { color: tokens.colors.text2, fontStyle: "italic" },
});
