import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";

const ALL_TABS: Array<{
  key: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: "sites", title: "Locations", icon: "list-outline", activeIcon: "list" },
  { key: "itinerary", title: "Itinerary", icon: "calendar-outline", activeIcon: "calendar" },
  { key: "map", title: "Map", icon: "map-outline", activeIcon: "map" },
  { key: "account", title: "Profile", icon: "person-outline", activeIcon: "person" },
];

function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const activeRouteName = state.routes[state.index]?.name ?? "sites";

  const onSelect = (tabKey: string) => {
    const targetRoute = state.routes.find((r: any) => r.name === tabKey);
    if (!targetRoute) return;
    const event = navigation.emit({ type: "tabPress", target: targetRoute.key, canPreventDefault: true });
    if (!event.defaultPrevented) {
      navigation.navigate(tabKey);
    }
  };

  return (
    <View
      style={[
        styles.bottomNav,
        {
          backgroundColor: tokens.colors.bgCard,
          borderTopColor: tokens.colors.border,
          paddingBottom: insets.bottom + 20,
        },
      ]}
    >
      {ALL_TABS.map((t) => {
        const isActive = t.key === activeRouteName;
        return (
          <Pressable
            key={t.key}
            onPress={() => onSelect(t.key)}
            style={[styles.tab, isActive && { backgroundColor: tokens.colors.surfDim }]}
          >
            <Ionicons
              name={isActive ? t.activeIcon : t.icon}
              size={24}
              color={isActive ? tokens.colors.surf : tokens.colors.text2}
            />
            <AppText
              variant="label"
              style={[styles.tabLabel, { color: isActive ? tokens.colors.surf : tokens.colors.text2 }]}
            >
              {t.title}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="sites" />
      <Tabs.Screen name="itinerary" />
      <Tabs.Screen name="map" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 14,
    marginHorizontal: 4,
  },
  tabLabel: {
    fontSize: 10,
  },
});
