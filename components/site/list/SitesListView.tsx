// components/site/list/SitesListView.tsx
import { useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { FlashList } from "@shopify/flash-list";

import { SiteListItem } from "@/components/site/list/SiteListItem";
import { tokens } from "@/lib/ui/tokens";
import type { SortedRow } from "@blacksands/hooks";
import type { Site } from "@/lib/models";

type SiteRow = SortedRow<Site>;

const ItemSeparator = () => <View style={styles.separator} />;

type SitesListViewProps = {
  rows: SiteRow[];
  header?: React.ReactElement | null;
  onPressSite: (id: string) => void;
  ListEmptyComponent?: React.ReactElement | null;
};

export function SitesListView({ rows, header, onPressSite, ListEmptyComponent }: SitesListViewProps) {
  const renderItem = useCallback(
    ({ item, index }: { item: SiteRow; index: number }) => (
      <SiteListItem
        id={item.location.id}
        name={item.location.name}
        description={item.location.description}
        imageUrl={item.location.imageThumbnailUrl ?? item.location.imageUrl}
        distanceMeters={item.distanceMeters}
        onPress={onPressSite}
        index={index}
      />
    ),
    [onPressSite],
  );

  return (
    <FlashList
      data={rows}
      keyExtractor={(item) => item.location.id}
      renderItem={renderItem}
      ItemSeparatorComponent={ItemSeparator}
      ListHeaderComponent={header ?? null}
      ListEmptyComponent={ListEmptyComponent ?? null}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: tokens.space.md,
    paddingBottom: 100,
  },
  separator: { height: tokens.space.md },
});