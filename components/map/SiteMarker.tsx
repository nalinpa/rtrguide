import React from "react";
import { View, StyleSheet } from "react-native";
import { Flame, Landmark, Compass, Trees, Waves, Camera, Utensils, Bed, MapPin, Check } from "lucide-react-native";
import { tokens } from "@/lib/ui/tokens";
import type { SiteCategory } from "@/lib/models";

type IconComponent = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

export const CATEGORY_CONFIG: Record<SiteCategory | "other", { Icon: IconComponent; color: string }> = {
  Geothermal: { Icon: Flame, color: "#E8590C" },
  Walks: { Icon: Trees, color: "#1F4B3D" },
  Attractions: { Icon: Camera, color: "#7C3AED" },
  Cultural: { Icon: Landmark, color: "#8C3D10" },
  Hotpools: { Icon: Waves, color: "#0369A1" },
  Adventure: { Icon: Compass, color: "#0D9488" },
  "Food & Drink": { Icon: Utensils, color: "#DC2626" },
  Stay: { Icon: Bed, color: "#4338CA" },
  other: { Icon: MapPin, color: "#475569" },
};

const CANVAS_SIZE = 40;
const CIRCLE_SIZE = 34;

export const SiteMarker = React.memo(function SiteMarker({
  selected,
  completed = false,
  category = "other",
}: {
  selected: boolean;
  completed?: boolean;
  category?: SiteCategory | "other";
}) {
  const { Icon, color } = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.other;

  return (
    <View style={styles.container}>
      <View style={[styles.circle, { borderColor: color }, selected && styles.selected]}>
        <Icon size={17} color={color} strokeWidth={2} />
      </View>
      {completed && (
        <View style={styles.badge}>
          <Check size={10} color="#FFFFFF" strokeWidth={3} />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  circle: {
    alignItems: "center",
    justifyContent: "center",
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  selected: {
    borderWidth: 3,
    transform: [{ scale: 1.15 }],
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 6,
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: tokens.colors.success,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
});
