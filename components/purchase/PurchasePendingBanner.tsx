import { ActivityIndicator, StyleSheet } from "react-native";

import { CardShell, Row, AppText } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";

export function PurchasePendingBanner() {
  return (
    <CardShell status="basic" style={styles.card}>
      <Row gap="lg" align="center">
        <ActivityIndicator color={tokens.colors.text} size="large" />
        <AppText variant="h3" style={{ color: tokens.colors.text2, flex: 1 }}>
          Finishing your purchase — this can take a moment.
        </AppText>
      </Row>
    </CardShell>
  );
}

const styles = StyleSheet.create({
  card: { padding: 24, borderRadius: 24 },
});
