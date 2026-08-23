// components/site/detail/SiteActionsBar.tsx
import { View, StyleSheet, Pressable } from "react-native";
import { MapPin, MessageSquarePlus, Heart, Navigation, Share2 } from "lucide-react-native";

import { AppText, AppButton, RatingStars, Row, Stack } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";

type SiteActionsBarProps = {
  hasReview: boolean;
  myReviewRating?: number;
  myReviewText?: string;
  onOpenReview: () => void;
};

function QuickAction({
  icon: Icon,
  label,
  onPress,
  disabled,
  active,
}: {
  icon: typeof MapPin;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  const color = active ? tokens.colors.success : tokens.colors.accent;
  return (
    <Pressable style={styles.quickAction} onPress={onPress} disabled={disabled} hitSlop={6}>
      <Icon size={22} color={color} />
      <AppText variant="label" style={[styles.quickActionLabel, { color }]}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function SiteQuickActions({
  onDirections,
  onOpenReview,
  hasReview,
  onShareBonus,
  shareBonus,
  isSaved,
  onToggleSave,
}: {
  onDirections: () => void;
  onOpenReview: () => void;
  hasReview: boolean;
  onShareBonus: () => void;
  shareBonus: boolean;
  isSaved: boolean;
  onToggleSave: () => void;
}) {
  return (
    <Row justify="space-between" gap="sm" style={styles.quickRow}>
      <QuickAction icon={Navigation} label="Directions" onPress={onDirections} />
      <QuickAction icon={MessageSquarePlus} label={hasReview ? "Reviewed" : "Review"} onPress={onOpenReview} active={hasReview} />
      <QuickAction
        icon={Share2}
        label={shareBonus ? "Shared" : "Share"}
        onPress={onShareBonus}
        disabled={shareBonus}
        active={shareBonus}
      />
      <QuickAction icon={Heart} label={isSaved ? "Saved" : "Save"} onPress={onToggleSave} active={isSaved} />
    </Row>
  );
}

export function SiteActionsBar({ hasReview, myReviewRating, myReviewText, onOpenReview }: SiteActionsBarProps) {
  return (
    <View style={styles.card}>
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
            <AppText style={styles.reviewText}>{`"${myReviewText?.trim() || "No written log provided."}"`}</AppText>
          )}
        </Stack>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  quickRow: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bgCard,
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.sm,
  },
  quickAction: { flex: 1, alignItems: "center", gap: 6 },
  quickActionLabel: { fontSize: 11 },
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
