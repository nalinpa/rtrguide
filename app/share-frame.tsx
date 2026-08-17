import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, View } from "react-native";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { captureRef } from "react-native-view-shot";
import * as ImagePicker from "expo-image-picker";
import { Camera, Image as ImageIcon, Trash2, Share2, Check } from "lucide-react-native";
import * as Sentry from "@sentry/react-native";

import { Screen, AppText, AppButton, AppIconButton, CardShell, Stack, Row } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { CaptureCanvas } from "@/components/share/CaptureCanvas";
import { shareService } from "@/lib/services/share/shareService";

export default function ShareFrameScreen() {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const shareCardRef = useRef<View>(null);
  const params = useLocalSearchParams<{ entityId: string; entityName: string }>();

  const dateLabel = useMemo(
    () => new Date().toLocaleDateString("en-NZ", { month: "short", year: "numeric" }),
    [],
  );

  const payload = useMemo(
    () => ({
      siteId: params.entityId || "",
      siteName: params.entityName || "",
      dateLabel,
    }),
    [params, dateLabel],
  );

  useEffect(() => {
    if (!photoUri) setPreviewUri(null);
  }, [photoUri]);

  const refreshPreview = useCallback(() => {
    setRendering(true);
    setTimeout(async () => {
      if (!shareCardRef.current) {
        setRendering(false);
        return;
      }
      try {
        const uri = await captureRef(shareCardRef, {
          format: "png",
          quality: 0.9,
          width: 1080,
          height: 1350,
        });
        setPreviewUri(uri);
      } catch (error) {
        Sentry.captureException(error);
        setPreviewUri(null);
      } finally {
        setRendering(false);
      }
    }, 200);
  }, []);

  const pickImage = async (useCamera: boolean) => {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        `RTR Guide needs access to your ${useCamera ? "camera" : "photo library"} to create a share card.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ aspect: [4, 5], allowsEditing: false, quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ aspect: [4, 5], allowsEditing: false, quality: 1 });

    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const onShare = async () => {
    if (!previewUri) return;
    setSharing(true);
    try {
      const res = await shareService.shareImageUriAsync(previewUri);
      if (res.ok) {
        setShareSuccess(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => router.back(), 1800);
      }
    } catch (error) {
      Sentry.captureException(error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSharing(false);
    }
  };

  return (
    <Screen scrollable>
      <CaptureCanvas ref={shareCardRef} payload={payload} photoUri={photoUri} onImageLoad={refreshPreview} />

      <Stack gap="lg">
        <AppText variant="screenTitle" numberOfLines={2}>
          {params.entityName || "Share"}
        </AppText>

        <CardShell header={<AppText variant="label" status="hint">YOUR PHOTO</AppText>}>
          <Row gap="sm">
            <AppButton variant="secondary" size="sm" icon={ImageIcon} onPress={() => pickImage(false)} style={styles.pickerBtn}>
              Gallery
            </AppButton>
            <AppButton variant="secondary" size="sm" icon={Camera} onPress={() => pickImage(true)} style={styles.pickerBtn}>
              Camera
            </AppButton>
          </Row>

          <Pressable onPress={() => !photoUri && pickImage(false)} style={styles.previewBox}>
            {photoUri ? (
              <>
                <Image source={{ uri: photoUri }} style={styles.fill} resizeMode="cover" />
                <View style={styles.removeBtn}>
                  <AppIconButton
                    icon={Trash2}
                    variant="control"
                    accessibilityLabel="Remove photo"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setPhotoUri(null);
                    }}
                  />
                </View>
              </>
            ) : (
              <Stack gap="sm" align="center" justify="center" style={styles.fill}>
                <ImageIcon size={32} color={tokens.colors.textMuted} />
                <AppText status="hint">Tap to add photo</AppText>
              </Stack>
            )}
          </Pressable>
        </CardShell>

        <CardShell header={<AppText variant="label" status="hint">YOUR FRAME</AppText>}>
          <View style={styles.previewBox}>
            {rendering ? (
              <Stack align="center" justify="center" style={styles.fill}>
                <AppText status="hint">Framing…</AppText>
              </Stack>
            ) : previewUri ? (
              <Image source={{ uri: previewUri }} style={styles.fill} resizeMode="cover" />
            ) : (
              <Stack align="center" justify="center" style={styles.fill}>
                <AppText status="hint" style={styles.centerText}>
                  Add a photo above to generate your frame
                </AppText>
              </Stack>
            )}
          </View>

          {shareSuccess ? (
            <Row gap="xs" align="center" justify="center">
              <Check size={18} color={tokens.colors.success} />
              <AppText status="success">Shared! Heading back…</AppText>
            </Row>
          ) : (
            <AppButton
              variant="primary"
              icon={Share2}
              onPress={onShare}
              disabled={!previewUri}
              loading={sharing}
              loadingLabel="Sharing…"
              fullWidth
            >
              Post to Social
            </AppButton>
          )}
        </CardShell>
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pickerBtn: { flex: 1 },
  previewBox: {
    width: "100%",
    aspectRatio: 4 / 5,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.bgSurface,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  fill: { width: "100%", height: "100%" },
  removeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
  },
  centerText: { textAlign: "center", paddingHorizontal: 24 },
});
