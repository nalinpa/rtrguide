// components/site/detail/SiteActionsBar.tsx
import { View, StyleSheet } from "react-native";
import { MapPin, CloudUpload, CheckCircle, MessageSquarePlus, Camera, Heart } from "lucide-react-native";

import { AppText, AppButton, RatingStars, Row, Stack } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";

type SiteActionsBarProps = {
  id: string;
  title: string;
  completed: boolean;
  completionMode: "gps" | "tick";
  isSyncing: boolean;
  locStatus: "unknown" | "granted" | "denied";
  hasLoc: boolean;
  canCheckIn: boolean;
  hasReview: boolean;
  myReviewRating?: number;
  myReviewText?: string;
  onOpenReview: () => void;
  onCheckIn: () => void;
  shareBonus: boolean;
  onShareBonus: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
};

export function SiteActionsBar({
  completed,
  completionMode,
  isSyncing,
  locStatus,
  hasLoc,
  canCheckIn,
  hasReview,
  myReviewRating,
  myReviewText,
  onOpenReview,
  onCheckIn,
  shareBonus,
  onShareBonus,
  isSaved,
  onToggleSave,
}: SiteActionsBarProps) {
  const saveRow = (
    <Row justify="flex-end">
      <AppButton variant={isSaved ? "success" : "ghost"} size="sm" icon={Heart} onPress={onToggleSave}>
        {isSaved ? "Saved" : "Save"}
      </AppButton>
    </Row>
  );

  if (!completed) {
    let buttonText: string;
    if (completionMode === "tick") buttonText = "Mark as Done";
    else if (locStatus === "denied") buttonText = "Location Disabled";
    else if (!hasLoc) buttonText = "Location Unavailable";
    else buttonText = "I'm Here";

    return (
      <Stack gap="sm">
        {saveRow}
        <AppButton
          variant="primary"
          size="lg"
          icon={MapPin}
          onPress={onCheckIn}
          disabled={completionMode === "gps" && !canCheckIn}
        >
          {buttonText}
        </AppButton>
        {completionMode === "gps" && hasLoc && !canCheckIn && (
          <AppText variant="label" status="hint" style={styles.centerText}>
            You must be at this site to check in.
          </AppText>
        )}
      </Stack>
    );
  }

  if (isSyncing) {
    return (
      <View style={[styles.card, styles.syncCard]}>
        <Stack gap="md">
          <Row gap="sm" align="center">
            <CloudUpload size={20} color={tokens.colors.warning} />
            <AppText style={styles.syncTitle}>Visit Saved Locally</AppText>
          </Row>
          <AppText style={styles.syncBody}>
            You are currently offline. We will sync this visit as soon as you reconnect!
          </AppText>
        </Stack>
      </View>
    );
  }

  return (
    <Stack gap="md">
      {saveRow}
      <View style={styles.card}>
        <Stack gap="lg">
          <Row gap="sm" align="center">
            <CheckCircle size={20} color={tokens.colors.success} />
            <AppText variant="h3">Completed</AppText>
          </Row>

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
            <AppButton
              variant={shareBonus ? "success" : "primary"}
              disabled={shareBonus}
              onPress={onShareBonus}
              icon={shareBonus ? CheckCircle : Camera}
            >
              {shareBonus ? "Photo Successfully Shared" : "Share a Photo"}
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
  syncCard: { backgroundColor: tokens.colors.warningDim, borderWidth: 0 },
  syncTitle: { color: tokens.colors.warning, fontWeight: "800" },
  syncBody: { color: tokens.colors.warning },
  innerBox: {
    backgroundColor: tokens.colors.bgSurface,
    borderRadius: tokens.radius.md,
    padding: tokens.space.sm,
  },
  reviewText: { color: tokens.colors.text2, fontStyle: "italic" },
  centerText: { textAlign: "center" },
});