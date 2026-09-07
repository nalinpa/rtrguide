import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Pressable, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, Mask, Rect } from "react-native-svg";
import Animated, { useSharedValue, useAnimatedProps, withTiming, FadeIn } from "react-native-reanimated";

import { tokens } from "@/lib/ui/tokens";
import { useTour } from "./TourContext";
import { ItineraryMockPreview } from "./ItineraryMockPreview";

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const HOLE_PADDING = 8;
const CARD_HEIGHT_ESTIMATE = 180;

export function SpotlightOverlay() {
  const { active, step, stepIndex, stepCount, targetRect: rawTargetRect, next, skip } = useTour();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const targetRect =
    rawTargetRect && (step?.targetOffsetY || step?.targetHeightDelta)
      ? {
          ...rawTargetRect,
          y: rawTargetRect.y + (step?.targetOffsetY ?? 0),
          height: rawTargetRect.height + (step?.targetHeightDelta ?? 0),
        }
      : rawTargetRect;

  const holeX = useSharedValue(width / 2);
  const holeY = useSharedValue(height / 2);
  const holeW = useSharedValue(0);
  const holeH = useSharedValue(0);

  useEffect(() => {
    if (targetRect) {
      holeX.value = withTiming(targetRect.x - HOLE_PADDING, { duration: 320 });
      holeY.value = withTiming(targetRect.y - HOLE_PADDING, { duration: 320 });
      holeW.value = withTiming(targetRect.width + HOLE_PADDING * 2, { duration: 320 });
      holeH.value = withTiming(targetRect.height + HOLE_PADDING * 2, { duration: 320 });
    } else {
      holeX.value = withTiming(width / 2, { duration: 200 });
      holeY.value = withTiming(height / 2, { duration: 200 });
      holeW.value = withTiming(0, { duration: 200 });
      holeH.value = withTiming(0, { duration: 200 });
    }
  }, [targetRect, width, height, holeX, holeY, holeW, holeH]);

  const holeProps = useAnimatedProps(() => ({
    x: holeX.value,
    y: holeY.value,
    width: holeW.value,
    height: holeH.value,
  }));

  // Cards vary a lot in height (a plain caption vs. the itinerary drag demo),
  // so positioning is re-measured per step rather than assuming a fixed size.
  const [cardHeight, setCardHeight] = useState(CARD_HEIGHT_ESTIMATE);
  useEffect(() => {
    setCardHeight(CARD_HEIGHT_ESTIMATE);
  }, [step?.id]);

  if (!active || !step) return null;

  const tooltipBelow = step.tooltipPosition
    ? step.tooltipPosition === "below"
    : !targetRect || targetRect.y + targetRect.height + cardHeight < height;
  const cardTop = targetRect
    ? tooltipBelow
      ? targetRect.y + targetRect.height + 20
      : Math.max(insets.top + 16, targetRect.y - cardHeight - 20)
    : Math.max(insets.top + 16, Math.min(insets.top + 70, height - insets.bottom - cardHeight - 16));

  const isLast = stepIndex === stepCount - 1;

  return (
    // A no-op Pressable (not a plain View) so it actively claims the touch
    // responder everywhere behind the dim/cutout, guaranteeing nothing
    // underneath is reachable during the tour — a bare View can still lose
    // the responder race to a screen's own elevated content on Android.
    <Pressable style={[StyleSheet.absoluteFill, styles.blocker]} onPress={() => {}}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <Mask id="spotlight-mask">
            <Rect x={0} y={0} width={width} height={height} fill="#FFFFFF" />
            <AnimatedRect animatedProps={holeProps} rx={16} fill="#000000" />
          </Mask>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={`rgba(10,8,6,${step.dim ?? 0.82})`} mask="url(#spotlight-mask)" />
      </Svg>

      {!isLast && (
        <TouchableOpacity
          style={[styles.skipBtn, { top: insets.top + 12 }]}
          onPress={skip}
          activeOpacity={0.7}
          hitSlop={12}
        >
          <Text style={styles.skipText}>Skip Tour</Text>
        </TouchableOpacity>
      )}

      <Animated.View
        key={step.id}
        entering={FadeIn.duration(220)}
        onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
        style={[styles.card, { top: cardTop }]}
      >
        {step.id === "plansPreview" && <ItineraryMockPreview />}
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.body}>{step.body}</Text>
        <View style={styles.footer}>
          <View style={styles.dots}>
            {Array.from({ length: stepCount }).map((_, i) => (
              <View key={i} style={[styles.dot, i === stepIndex && styles.dotActive]} />
            ))}
          </View>
          <TouchableOpacity style={styles.nextBtn} onPress={next} activeOpacity={0.85}>
            <Text style={styles.nextText}>{isLast ? "Done" : "Next"}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  blocker: { elevation: 999, zIndex: 999 },
  skipBtn: {
    position: "absolute",
    right: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  skipText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  card: {
    position: "absolute",
    left: 20,
    right: 20,
    backgroundColor: "#1A130D",
    borderRadius: tokens.radius.lg,
    borderWidth: 1.5,
    borderColor: tokens.colors.accent,
    padding: 20,
    gap: 8,
    shadowColor: tokens.colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 16,
  },
  title: { fontSize: 19, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.3 },
  body: { fontSize: 14, fontWeight: "400", color: "rgba(255,255,255,0.75)", lineHeight: 21 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  dots: { flexDirection: "row", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.25)" },
  dotActive: { backgroundColor: tokens.colors.accent, width: 16 },
  nextBtn: { backgroundColor: tokens.colors.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 99 },
  nextText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
