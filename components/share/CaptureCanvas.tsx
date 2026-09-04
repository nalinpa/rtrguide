import React, { forwardRef } from "react";
import { View, StyleSheet, Image, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { ShareSitePayload } from "@/lib/services/share/types";
import { tokens } from "@/lib/ui/tokens";

interface CaptureCanvasProps {
  payload: ShareSitePayload;
  photoUri: string | null;
  onImageLoad?: () => void;
}

// Canvas is 1080×1350 (4:5) — rendered off-screen, captured by react-native-view-shot
export const CaptureCanvas = forwardRef<View, CaptureCanvasProps>(
  ({ payload, photoUri, onImageLoad }, ref) => (
    <View pointerEvents="none" style={styles.hiddenContainer}>
      <View ref={ref} collapsable={false} style={styles.canvas}>
        {/* Full-bleed photo */}
        {photoUri && (
          <Image
            source={{ uri: photoUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onLoad={onImageLoad}
          />
        )}

        {/* Top gradient overlay with site name */}
        <LinearGradient
          colors={["rgba(36,26,18,0.92)", "rgba(36,26,18,0.6)", "transparent"]}
          style={styles.topOverlay}
        >
          <Text style={styles.cityLabel}>Rotorua</Text>
          <Text style={styles.siteName} numberOfLines={2}>
            {payload.siteName}
          </Text>
        </LinearGradient>

        {/* Corner brackets */}
        <View style={[styles.bracket, styles.bracketTL]} />
        <View style={[styles.bracket, styles.bracketTR]} />
        <View style={[styles.bracket, styles.bracketBL]} />
        <View style={[styles.bracket, styles.bracketBR]} />

        {/* Footer strip */}
        <View style={styles.footer}>
          <Text style={styles.brandLabel}>Rotorua Guide</Text>
          <View style={styles.dateBadge}>
            <Text style={styles.dateText}>{payload.dateLabel}</Text>
          </View>
        </View>
      </View>
    </View>
  ),
);

const BRACKET_SIZE = 64;
const BRACKET_THICKNESS = 6;
const BRACKET_OFFSET = 52;
const BRACKET_COLOR = "rgba(255,255,255,0.35)";

const styles = StyleSheet.create({
  hiddenContainer: { position: "absolute", left: -2000, top: 0 },
  canvas: { width: 1080, height: 1350, backgroundColor: tokens.colors.text, overflow: "hidden" },

  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 520,
    justifyContent: "flex-start",
    paddingHorizontal: 64,
    paddingTop: 140,
  },
  cityLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: 8,
    textTransform: "uppercase",
    marginBottom: 24,
  },
  siteName: {
    color: "#FFFFFF",
    fontSize: 96,
    fontWeight: "900",
    letterSpacing: -2,
    lineHeight: 100,
    textTransform: "uppercase",
  },

  // Corner brackets — each uses two-sided border to form an L shape
  bracket: {
    position: "absolute",
    width: BRACKET_SIZE,
    height: BRACKET_SIZE,
  },
  bracketTL: {
    top: BRACKET_OFFSET,
    left: BRACKET_OFFSET,
    borderTopWidth: BRACKET_THICKNESS,
    borderLeftWidth: BRACKET_THICKNESS,
    borderColor: BRACKET_COLOR,
  },
  bracketTR: {
    top: BRACKET_OFFSET,
    right: BRACKET_OFFSET,
    borderTopWidth: BRACKET_THICKNESS,
    borderRightWidth: BRACKET_THICKNESS,
    borderColor: BRACKET_COLOR,
  },
  bracketBL: {
    bottom: 100 + BRACKET_OFFSET,
    left: BRACKET_OFFSET,
    borderBottomWidth: BRACKET_THICKNESS,
    borderLeftWidth: BRACKET_THICKNESS,
    borderColor: BRACKET_COLOR,
  },
  bracketBR: {
    bottom: 100 + BRACKET_OFFSET,
    right: BRACKET_OFFSET,
    borderBottomWidth: BRACKET_THICKNESS,
    borderRightWidth: BRACKET_THICKNESS,
    borderColor: BRACKET_COLOR,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: tokens.colors.text,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 64,
  },
  brandLabel: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 6,
    textTransform: "uppercase",
  },
  dateBadge: {
    borderWidth: 2,
    borderColor: tokens.colors.accent,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  dateText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: 4,
    textTransform: "uppercase",
  },
});
