import "@/lib/polyfills/buffer";
import React, { useEffect } from "react";
import { View, StyleSheet, Text, Button } from "react-native";
import { Stack, useNavigationContainerRef, ErrorBoundaryProps } from "expo-router";
import { isRunningInExpoGo } from "expo";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Sentry from "@sentry/react-native";

import { AppProviders } from "@/lib/providers/AppProviders";
import { OfflineBanner } from "@/lib/uiKit";
import { hooksBag } from "@/lib/hooksBag";
import { useAppOpenCount } from "@/lib/hooks/useAppOpenCount";

const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: !isRunningInExpoGo(),
});

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: false,
  tracesSampleRate: 1.0,
  integrations: [navigationIntegration],
  enableNativeFramesTracking: false,
});

SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const ref = useNavigationContainerRef();
  const openCount = useAppOpenCount();
  const { requestReview } = hooksBag.useReviewPrompt();

  useEffect(() => {
    if (ref) {
      navigationIntegration.registerNavigationContainer(ref);
    }
  }, [ref]);

  useEffect(() => {
    if (openCount === 2) requestReview();
  }, [openCount, requestReview]);

  return (
    <GestureHandlerRootView style={styles.flexStyle}>
      <AppProviders>
        <OfflineBanner />

        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="share-frame"
            options={{
              presentation: "modal",
              headerShown: true,
              title: "Share",
            }}
          />
        </Stack>
      </AppProviders>
    </GestureHandlerRootView>
  );
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <View style={styles.errorBoundaryContainer}>
      <Text style={styles.errorTitle}>App Crashed</Text>
      <Text style={styles.errorMessage}>
        {error.message || "An unexpected error occurred."}
      </Text>
      <Button title="Restart App" onPress={retry} />
    </View>
  );
}

const styles = StyleSheet.create({
  flexStyle: { flex: 1 },
  errorBoundaryContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    marginBottom: 24,
  },
});

export default Sentry.wrap(RootLayout);
