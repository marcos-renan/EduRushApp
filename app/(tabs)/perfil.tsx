import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Switch,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { GradientScreen } from "../../src/components/GradientScreen";
import { StyledDialog, type StyledDialogAction, type StyledDialogVariant } from "../../src/components/StyledDialog";
import { logoutRequest } from "../../src/services/api/auth";
import { extractApiError, resolveApiAssetUrl } from "../../src/services/api/client";
import { getProfile, updateProfile, updateProfilePhoto } from "../../src/services/api/profile";
import { useAuthStore } from "../../src/store/auth-store";
import { useThemeStore } from "../../src/store/theme-store";
import { useAppTheme } from "../../src/theme/app-theme";
import { palette } from "../../src/theme/palette";

const gradeOptions = [
  { label: "1o ano", value: 1 },
  { label: "2o ano", value: 2 },
  { label: "3o ano", value: 3 },
];

const CROP_SIZE = 236;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

type DialogState = {
  visible: boolean;
  title: string;
  message?: string;
  variant: StyledDialogVariant;
  actions: StyledDialogAction[];
};

type PendingImage = {
  uri: string;
  width: number;
  height: number;
  fileName?: string | null;
  mimeType?: string | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getTouchesDistance(touches: readonly { pageX: number; pageY: number }[]) {
  if (touches.length < 2) return 0;
  const first = touches[0];
  const second = touches[1];
  const dx = first.pageX - second.pageX;
  const dy = first.pageY - second.pageY;
  return Math.hypot(dx, dy);
}

function computeCropMetrics(image: PendingImage | null, zoom: number) {
  if (!image) return null;

  const width = Math.max(1, image.width);
  const height = Math.max(1, image.height);
  const baseScale = Math.max(CROP_SIZE / width, CROP_SIZE / height);
  const scale = baseScale * zoom;
  const displayWidth = width * scale;
  const displayHeight = height * scale;
  const maxOffsetX = Math.max(0, (displayWidth - CROP_SIZE) / 2);
  const maxOffsetY = Math.max(0, (displayHeight - CROP_SIZE) / 2);

  return {
    width,
    height,
    scale,
    displayWidth,
    displayHeight,
    maxOffsetX,
    maxOffsetY,
  };
}

export default function PerfilScreen() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const updateUser = useAuthStore((state) => state.updateUser);
  const updateProfileStore = useAuthStore((state) => state.updateProfile);
  const clearSession = useAuthStore((state) => state.clearSession);
  const isDark = useThemeStore((state) => state.isDark);
  const setDarkMode = useThemeStore((state) => state.setDarkMode);
  const { colors } = useAppTheme();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [gradeYear, setGradeYear] = useState(profile?.grade_year ?? 1);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState<number>(Date.now());
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [cropZoom, setCropZoom] = useState<number>(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [isCropModalVisible, setIsCropModalVisible] = useState(false);
  const [isProcessingCrop, setIsProcessingCrop] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>({
    visible: false,
    title: "",
    message: undefined,
    variant: "info",
    actions: [],
  });
  const panStartRef = useRef({ x: 0, y: 0 });
  const cropOffsetRef = useRef({ x: 0, y: 0 });
  const cropZoomRef = useRef(1);
  const isPinchingRef = useRef(false);
  const pinchStartDistanceRef = useRef(0);
  const pinchStartZoomRef = useRef(1);
  const queryClient = useQueryClient();

  const closeDialog = () => {
    setDialogState((previous) => ({ ...previous, visible: false }));
  };

  const openDialog = ({
    title,
    message,
    variant = "info",
    actions = [],
  }: {
    title: string;
    message?: string;
    variant?: StyledDialogVariant;
    actions?: StyledDialogAction[];
  }) => {
    setDialogState({
      visible: true,
      title,
      message,
      variant,
      actions,
    });
  };

  const profileQuery = useQuery({
    queryKey: ["profile", token],
    queryFn: () => getProfile(token!),
    enabled: !!token,
  });

  useEffect(() => {
    if (!profileQuery.data) return;

    const response = profileQuery.data.data;
    setName(response.user.name);
    setEmail(response.user.email);
    const currentGradeYear = response.student_profile?.grade_year ?? 1;
    setGradeYear(currentGradeYear);
  }, [profileQuery.data]);

  const avatarUri = useMemo(() => {
    const rawUrl = resolveApiAssetUrl(user?.profile_photo_url ?? profileQuery.data?.data.user.profile_photo_url ?? null);
    if (!rawUrl) return null;
    const separator = rawUrl.includes("?") ? "&" : "?";
    return `${rawUrl}${separator}v=${avatarVersion}`;
  }, [profileQuery.data, user?.profile_photo_url, avatarVersion]);

  const cropMetrics = useMemo(() => computeCropMetrics(pendingImage, cropZoom), [pendingImage, cropZoom]);

  const setCropOffsetSynced = useCallback((nextOffset: { x: number; y: number }) => {
    cropOffsetRef.current = nextOffset;
    setCropOffset(nextOffset);
  }, []);

  const setCropZoomSynced = useCallback((nextZoom: number) => {
    cropZoomRef.current = nextZoom;
    setCropZoom(nextZoom);
  }, []);

  const clampOffsetForZoom = useCallback(
    (nextOffset: { x: number; y: number }, zoom: number) => {
      const metrics = computeCropMetrics(pendingImage, zoom);
      if (!metrics) return { x: 0, y: 0 };

      return {
        x: clamp(nextOffset.x, -metrics.maxOffsetX, metrics.maxOffsetX),
        y: clamp(nextOffset.y, -metrics.maxOffsetY, metrics.maxOffsetY),
      };
    },
    [pendingImage]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !!pendingImage,
        onMoveShouldSetPanResponder: () => !!pendingImage,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          panStartRef.current = cropOffsetRef.current;
          const touches = event.nativeEvent.touches as Array<{ pageX: number; pageY: number }>;
          if (touches.length >= 2) {
            isPinchingRef.current = true;
            pinchStartDistanceRef.current = getTouchesDistance(touches) || 1;
            pinchStartZoomRef.current = cropZoomRef.current;
            return;
          }
          isPinchingRef.current = false;
        },
        onPanResponderMove: (event, gestureState) => {
          if (!pendingImage) return;
          const touches = event.nativeEvent.touches as Array<{ pageX: number; pageY: number }>;

          if (touches.length >= 2) {
            const currentDistance = getTouchesDistance(touches);
            if (!isPinchingRef.current) {
              isPinchingRef.current = true;
              pinchStartDistanceRef.current = currentDistance || 1;
              pinchStartZoomRef.current = cropZoomRef.current;
              return;
            }

            const pinchRatio = currentDistance / (pinchStartDistanceRef.current || 1);
            const nextZoom = clamp(pinchStartZoomRef.current * pinchRatio, MIN_ZOOM, MAX_ZOOM);
            setCropZoomSynced(nextZoom);
            setCropOffsetSynced(clampOffsetForZoom(cropOffsetRef.current, nextZoom));
            return;
          }

          if (isPinchingRef.current) {
            isPinchingRef.current = false;
            panStartRef.current = cropOffsetRef.current;
          }

          setCropOffsetSynced(
            clampOffsetForZoom(
              {
                x: panStartRef.current.x + gestureState.dx,
                y: panStartRef.current.y + gestureState.dy,
              },
              cropZoomRef.current
            )
          );
        },
        onPanResponderRelease: () => {
          isPinchingRef.current = false;
        },
        onPanResponderTerminate: () => {
          isPinchingRef.current = false;
        },
      }),
    [clampOffsetForZoom, pendingImage, setCropOffsetSynced, setCropZoomSynced]
  );

  const saveMutation = useMutation({
    mutationFn: () =>
      updateProfile(token!, {
        name,
        email,
        grade_year: gradeYear,
        password: password.trim() ? password : undefined,
        password_confirmation: password.trim() ? passwordConfirmation : undefined,
      }),
    onSuccess: async (response) => {
      await updateUser(response.data.user);
      if (response.data.student_profile) {
        await updateProfileStore(response.data.student_profile);
      }
      queryClient.setQueryData(["profile", token], response);
      setPassword("");
      setPasswordConfirmation("");
      openDialog({
        title: "Perfil atualizado",
        message: "Seus dados foram salvos com sucesso.",
        variant: "success",
      });
    },
  });

  const photoMutation = useMutation({
    mutationFn: (payload: { uri: string; name?: string | null; mimeType?: string | null }) =>
      updateProfilePhoto(token!, payload),
    onSuccess: async (response) => {
      await updateUser(response.data.user);
      if (response.data.student_profile) {
        await updateProfileStore(response.data.student_profile);
      }
      queryClient.setQueryData(["profile", token], response);
      setAvatarVersion(Date.now());
    },
  });

  const handlePhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error("Permissao de fotos negada.");
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      const nextPendingImage: PendingImage = {
        uri: asset.uri,
        width: asset.width ?? 1080,
        height: asset.height ?? 1080,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
      };

      setPendingImage(nextPendingImage);
      setCropZoomSynced(1);
      setCropOffsetSynced({ x: 0, y: 0 });
      setIsCropModalVisible(true);
    } catch (error) {
      const customMessage = error instanceof Error ? error.message : null;
      const message =
        customMessage && customMessage !== "Request failed with status code 422"
          ? customMessage
          : extractApiError(error);
      openDialog({
        title: "Falha ao atualizar foto",
        message,
        variant: "error",
      });
    }
  };

  const handleCloseCropModal = () => {
    if (isProcessingCrop || photoMutation.isPending) return;
    setIsCropModalVisible(false);
    setPendingImage(null);
    setCropZoomSynced(1);
    setCropOffsetSynced({ x: 0, y: 0 });
  };

  const handleConfirmCrop = async () => {
    if (!pendingImage || !token) return;

    const currentZoom = cropZoomRef.current;
    const currentOffset = cropOffsetRef.current;
    const currentMetrics = computeCropMetrics(pendingImage, currentZoom);
    if (!currentMetrics) return;

    try {
      setIsProcessingCrop(true);
      const cropWidth = clamp(CROP_SIZE / currentMetrics.scale, 1, pendingImage.width);
      const cropHeight = clamp(CROP_SIZE / currentMetrics.scale, 1, pendingImage.height);
      const cropOriginX = clamp(
        pendingImage.width / 2 + (-CROP_SIZE / 2 - currentOffset.x) / currentMetrics.scale,
        0,
        pendingImage.width - cropWidth
      );
      const cropOriginY = clamp(
        pendingImage.height / 2 + (-CROP_SIZE / 2 - currentOffset.y) / currentMetrics.scale,
        0,
        pendingImage.height - cropHeight
      );

      const manipulated = await ImageManipulator.manipulateAsync(
        pendingImage.uri,
        [
          {
            crop: {
              originX: cropOriginX,
              originY: cropOriginY,
              width: cropWidth,
              height: cropHeight,
            },
          },
          {
            resize: {
              width: 720,
              height: 720,
            },
          },
        ],
        {
          compress: 0.86,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      await photoMutation.mutateAsync({
        uri: manipulated.uri,
        name: pendingImage.fileName ?? `profile-${Date.now()}.jpg`,
        mimeType: "image/jpeg",
      });

      setIsCropModalVisible(false);
      setPendingImage(null);
      setCropZoomSynced(1);
      setCropOffsetSynced({ x: 0, y: 0 });
      openDialog({
        title: "Foto atualizada",
        message: "Sua foto de perfil foi atualizada com sucesso.",
        variant: "success",
      });
    } catch (error) {
      const message = extractApiError(error);
      openDialog({
        title: "Falha ao atualizar foto",
        message,
        variant: "error",
      });
    } finally {
      setIsProcessingCrop(false);
    }
  };

  const handleGradeSelect = (nextGradeYear: number) => {
    if (nextGradeYear === gradeYear) {
      return;
    }

    const isDowngrade = nextGradeYear < gradeYear;
    const message = isDowngrade
      ? "A partir daqui as missoes podem ficar mais faceis."
      : "A partir daqui as missoes podem ficar mais dificeis.";

    openDialog({
      title: "Quer continuar?",
      message,
      variant: "warning",
      actions: [
        {
          label: "Cancelar",
          kind: "secondary",
          onPress: closeDialog,
        },
        {
          label: "Continuar",
          kind: "primary",
          onPress: () => {
            setGradeYear(nextGradeYear);
            closeDialog();
          },
        },
      ],
    });
  };

  const handleSave = () => {
    if (!name.trim()) {
      openDialog({
        title: "Nome obrigatorio",
        message: "Informe seu nome.",
        variant: "warning",
      });
      return;
    }

    if (!email.trim()) {
      openDialog({
        title: "E-mail obrigatorio",
        message: "Informe seu e-mail.",
        variant: "warning",
      });
      return;
    }

    if (password.trim() && password !== passwordConfirmation) {
      openDialog({
        title: "Senhas diferentes",
        message: "A confirmacao de senha deve ser igual.",
        variant: "warning",
      });
      return;
    }

    saveMutation.mutate();
  };

  const handleLogout = async () => {
    try {
      if (token) {
        await logoutRequest(token);
      }
    } finally {
      await clearSession();
      router.replace("/(auth)/login");
    }
  };

  return (
    <GradientScreen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Perfil</Text>
        <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>Gerencie seus dados e foto da conta.</Text>

        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.themeRow}>
            <View style={styles.themeTextWrap}>
              <Text style={[styles.themeTitle, { color: colors.textPrimary }]}>Modo Escuro</Text>
              <Text style={[styles.themeSubtitle, { color: colors.textSecondary }]}>
                Ative para usar o app com visual escuro.
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={(value) => {
                void setDarkMode(value);
              }}
              trackColor={{ false: "#9FB2D5", true: colors.primary }}
              thumbColor={isDark ? "#ffffff" : "#f4f4f5"}
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.avatarRow}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}>
                <Text style={[styles.avatarFallbackText, { color: colors.primary }]}>
                  {(name?.trim()?.charAt(0) || user?.name?.charAt(0) || "U").toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.avatarActions}>
              <Text style={[styles.avatarName, { color: colors.textPrimary }]}>{name || user?.name || "Aluno"}</Text>
              <Pressable
                onPress={handlePhoto}
                disabled={photoMutation.isPending}
                style={({ pressed }) => [
                  styles.photoButton,
                  { backgroundColor: colors.primary },
                  pressed && !photoMutation.isPending && styles.photoButtonPressed,
                ]}
              >
                {photoMutation.isPending ? (
                  <ActivityIndicator color={palette.white} />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={16} color={palette.white} />
                    <Text style={styles.photoButtonText}>Trocar foto</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Dados da conta</Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Nome</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.inputBackground, color: colors.inputText }]}
              placeholder="Seu nome"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>E-mail</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.inputBackground, color: colors.inputText }]}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="aluno@edurush.com"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Serie</Text>
            <View style={styles.gradeRow}>
              {gradeOptions.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => handleGradeSelect(option.value)}
                  style={[
                    styles.gradeChip,
                    { borderColor: colors.border, backgroundColor: colors.primarySoft },
                    gradeYear === option.value && [styles.gradeChipActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
                  ]}
                >
                  <Text
                    style={[
                      styles.gradeChipText,
                      { color: colors.primary },
                      gradeYear === option.value && styles.gradeChipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Alterar senha (opcional)</Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Nova senha</Text>
            <View style={[styles.passwordWrapper, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.passwordInput, { color: colors.inputText }]}
                placeholder="******"
                placeholderTextColor={colors.textMuted}
              />
              <Pressable onPress={() => setShowPassword((prev) => !prev)} style={styles.passwordToggle}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Confirmar nova senha</Text>
            <View style={[styles.passwordWrapper, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}>
              <TextInput
                value={passwordConfirmation}
                onChangeText={setPasswordConfirmation}
                secureTextEntry={!showPasswordConfirmation}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.passwordInput, { color: colors.inputText }]}
                placeholder="******"
                placeholderTextColor={colors.textMuted}
              />
              <Pressable
                onPress={() => setShowPasswordConfirmation((prev) => !prev)}
                style={styles.passwordToggle}
              >
                <Ionicons
                  name={showPasswordConfirmation ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>
          </View>
        </View>

        {(saveMutation.isError || profileQuery.isError) && (
          <Text style={styles.errorText}>{extractApiError(saveMutation.error || profileQuery.error)}</Text>
        )}

        <Pressable
          onPress={handleSave}
          disabled={saveMutation.isPending || profileQuery.isLoading}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: colors.primary },
            (saveMutation.isPending || profileQuery.isLoading) && styles.primaryButtonDisabled,
            pressed && !(saveMutation.isPending || profileQuery.isLoading) && styles.primaryButtonPressed,
          ]}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator color={palette.white} />
          ) : (
            <Text style={styles.primaryButtonText}>Salvar alteracoes</Text>
          )}
        </Pressable>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            { backgroundColor: colors.dangerSurface, borderColor: colors.dangerBorder },
            pressed && styles.logoutPressed,
          ]}
        >
          <Ionicons name="log-out-outline" size={16} color={palette.danger} />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </Pressable>
      </ScrollView>
      <StyledDialog
        visible={dialogState.visible}
        title={dialogState.title}
        message={dialogState.message}
        variant={dialogState.variant}
        actions={dialogState.actions}
        onClose={closeDialog}
      />
      <Modal
        visible={isCropModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseCropModal}
      >
        <View style={styles.cropModalOverlay}>
          <Pressable style={styles.cropModalBackdrop} onPress={handleCloseCropModal} />
          <View
            style={[
              styles.cropModalCard,
              { backgroundColor: colors.cardBackground, borderColor: colors.border },
            ]}
          >
            <View style={styles.cropHeader}>
              <Ionicons name="camera-outline" size={18} color={colors.primary} />
              <Text style={[styles.cropTitle, { color: colors.textPrimary }]}>Enquadrar foto</Text>
            </View>
            <Text style={[styles.cropSubtitle, { color: colors.textSecondary }]}>
              Arraste com um dedo e use pinça com dois dedos para aproximar.
            </Text>

            <View style={[styles.cropViewport, { borderColor: colors.primarySoft }]}>
              {pendingImage && cropMetrics ? (
                <View style={styles.cropImageWrap} {...panResponder.panHandlers}>
                  <Image
                    source={{ uri: pendingImage.uri }}
                    style={[
                      styles.cropImage,
                      {
                        width: cropMetrics.displayWidth,
                        height: cropMetrics.displayHeight,
                        transform: [{ translateX: cropOffset.x }, { translateY: cropOffset.y }],
                      },
                    ]}
                  />
                </View>
              ) : (
                <View style={[styles.cropLoading, { backgroundColor: colors.primarySoft }]}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              )}
            </View>

            <View style={styles.zoomRow}>
              <View style={styles.zoomMeterWrap}>
                <View style={[styles.zoomTrack, { backgroundColor: colors.primarySoft }]}>
                  <View
                    style={[
                      styles.zoomFill,
                      {
                        backgroundColor: colors.primary,
                        width: `${((cropZoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.zoomLabel, { color: colors.textSecondary }]}>
                  Zoom {cropZoom.toFixed(2)}x
                </Text>
              </View>
            </View>

            <View style={styles.cropActions}>
              <Pressable
                onPress={handleCloseCropModal}
                disabled={isProcessingCrop || photoMutation.isPending}
                style={({ pressed }) => [
                  styles.cropSecondaryButton,
                  { borderColor: colors.border, backgroundColor: colors.cardBackground },
                  pressed && styles.cropButtonPressed,
                ]}
              >
                <Text style={[styles.cropSecondaryButtonText, { color: colors.textPrimary }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmCrop}
                disabled={isProcessingCrop || photoMutation.isPending}
                style={({ pressed }) => [
                  styles.cropPrimaryButton,
                  { backgroundColor: colors.primary },
                  (isProcessingCrop || photoMutation.isPending) && styles.cropPrimaryButtonDisabled,
                  pressed && !(isProcessingCrop || photoMutation.isPending) && styles.cropButtonPressed,
                ]}
              >
                {isProcessingCrop || photoMutation.isPending ? (
                  <ActivityIndicator color={palette.white} />
                ) : (
                  <Text style={styles.cropPrimaryButtonText}>Salvar foto</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    gap: 12,
  },
  screenTitle: {
    color: palette.slate900,
    fontSize: 24,
    fontWeight: "900",
  },
  screenSubtitle: {
    color: palette.slate700,
    fontSize: 14,
    fontWeight: "600",
  },
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  themeTextWrap: {
    flex: 1,
  },
  themeTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  themeSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.blue200,
    backgroundColor: palette.white,
    padding: 14,
    gap: 10,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: palette.blue200,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.blue100,
    borderWidth: 1,
    borderColor: palette.blue200,
  },
  avatarFallbackText: {
    color: palette.blue700,
    fontSize: 26,
    fontWeight: "900",
  },
  avatarActions: {
    flex: 1,
    gap: 8,
  },
  avatarName: {
    color: palette.slate900,
    fontSize: 17,
    fontWeight: "900",
  },
  photoButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    backgroundColor: palette.blue700,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  photoButtonPressed: {
    opacity: 0.85,
  },
  photoButtonText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: "800",
  },
  sectionTitle: {
    color: palette.slate900,
    fontSize: 15,
    fontWeight: "900",
  },
  field: {
    gap: 6,
  },
  label: {
    color: palette.slate700,
    fontSize: 12,
    fontWeight: "800",
  },
  input: {
    borderWidth: 1,
    borderColor: palette.blue200,
    backgroundColor: palette.blue100,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: palette.slate900,
    fontSize: 14,
    fontWeight: "600",
  },
  gradeRow: {
    flexDirection: "row",
    gap: 8,
  },
  gradeChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.blue200,
    backgroundColor: palette.blue100,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 9,
  },
  gradeChipActive: {
    backgroundColor: palette.blue700,
    borderColor: palette.blue700,
  },
  gradeChipText: {
    color: palette.blue700,
    fontSize: 12,
    fontWeight: "800",
  },
  gradeChipTextActive: {
    color: palette.white,
  },
  passwordWrapper: {
    borderWidth: 1,
    borderColor: palette.blue200,
    backgroundColor: palette.blue100,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: palette.slate900,
    fontSize: 14,
    fontWeight: "600",
  },
  passwordToggle: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: palette.danger,
    fontSize: 13,
    fontWeight: "700",
  },
  primaryButton: {
    borderRadius: 12,
    backgroundColor: palette.blue700,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
  },
  primaryButtonDisabled: {
    backgroundColor: palette.slate300,
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    color: palette.white,
    fontSize: 15,
    fontWeight: "800",
  },
  logoutButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFB5C0",
    backgroundColor: "#FFF3F5",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    flexDirection: "row",
    gap: 6,
  },
  logoutPressed: {
    opacity: 0.85,
  },
  logoutText: {
    color: palette.danger,
    fontSize: 14,
    fontWeight: "800",
  },
  cropModalOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  cropModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3, 9, 20, 0.6)",
  },
  cropModalCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cropHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cropTitle: {
    fontSize: 17,
    fontWeight: "900",
  },
  cropSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  cropViewport: {
    alignSelf: "center",
    width: CROP_SIZE,
    height: CROP_SIZE,
    borderRadius: CROP_SIZE / 2,
    borderWidth: 3,
    overflow: "hidden",
    backgroundColor: "#000000",
  },
  cropImageWrap: {
    width: CROP_SIZE,
    height: CROP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  cropImage: {
    position: "absolute",
  },
  cropLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomRow: {
    alignItems: "center",
  },
  zoomMeterWrap: {
    width: "100%",
    gap: 6,
  },
  zoomTrack: {
    height: 8,
    borderRadius: 99,
    overflow: "hidden",
  },
  zoomFill: {
    height: "100%",
    borderRadius: 99,
  },
  zoomLabel: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  cropActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  cropSecondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 11,
    paddingVertical: 11,
    alignItems: "center",
  },
  cropSecondaryButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },
  cropPrimaryButton: {
    flex: 1,
    borderRadius: 11,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  cropPrimaryButtonDisabled: {
    opacity: 0.7,
  },
  cropPrimaryButtonText: {
    color: palette.white,
    fontSize: 13,
    fontWeight: "900",
  },
  cropButtonPressed: {
    opacity: 0.85,
  },
});
