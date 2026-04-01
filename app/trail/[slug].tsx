import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { EnergyChip } from "../../src/components/EnergyChip";
import { GradientScreen } from "../../src/components/GradientScreen";
import { getTrailBySlug } from "../../src/services/api/trails";
import { useAuthStore } from "../../src/store/auth-store";
import { useAppTheme } from "../../src/theme/app-theme";
import { palette } from "../../src/theme/palette";
import type { TrailLesson } from "../../src/types/api";

const NODE_SIZE = 62;
const ROAD_STROKE = 5;

function difficultyLabel(difficulty?: string) {
  const value = (difficulty ?? "").toLowerCase().trim();
  if (["advanced", "hard", "dificil"].includes(value)) return "Dificil";
  if (["intermediate", "medium", "medio"].includes(value)) return "Medio";
  return "Facil";
}

function buildNodePositions(total: number, width: number) {
  if (total <= 0) return [];

  const horizontalPadding = 56;
  const centerX = width / 2;
  const amplitude = Math.max(36, Math.min(92, (width - horizontalPadding * 2) / 2));
  const verticalSpacing = 116;
  const topOffset = 62;

  return Array.from({ length: total }, (_, index) => {
    const progress = total === 1 ? 0 : index / (total - 1);
    const wave = Math.sin(progress * Math.PI * 2.6) * 0.6 + (index % 2 === 0 ? -0.55 : 0.55);
    const x = Math.max(horizontalPadding, Math.min(width - horizontalPadding, centerX + wave * amplitude));
    const y = topOffset + index * verticalSpacing;
    return { x, y };
  });
}

type LessonNodeButtonProps = {
  lesson: TrailLesson;
  x: number;
  y: number;
  isFocus: boolean;
  isDark: boolean;
  primaryColor: string;
  borderColor: string;
  onPress: () => void;
};

const LessonNodeButton = memo(function LessonNodeButton({
  lesson,
  x,
  y,
  isFocus,
  isDark,
  primaryColor,
  borderColor,
  onPress,
}: LessonNodeButtonProps) {
  const press = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isFocus || lesson.is_locked) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => {
      loop.stop();
    };
  }, [isFocus, lesson.is_locked, pulse]);

  const handlePressIn = () => {
    Animated.spring(press, {
      toValue: 1,
      useNativeDriver: true,
      speed: 28,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(press, {
      toValue: 0,
      useNativeDriver: true,
      speed: 24,
      bounciness: 7,
    }).start();
  };

  const state = lesson.is_locked ? "locked" : lesson.is_completed ? "completed" : "available";
  const topColor =
    state === "completed"
      ? isDark
        ? "#1E9E6A"
        : "#1DBC80"
      : state === "locked"
        ? isDark
          ? "#536280"
          : "#AAB6D3"
        : primaryColor;

  const baseColor =
    state === "completed"
      ? isDark
        ? "#116243"
        : "#108A5D"
      : state === "locked"
        ? isDark
          ? "#39465E"
          : "#8291B2"
        : isDark
          ? "#264C95"
          : "#0F4BC9";

  const iconName = state === "completed" ? "checkmark" : state === "locked" ? "lock-closed" : "play";

  const translateY = press.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 5],
  });
  const scale = press.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.96],
  });
  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.52],
  });
  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0],
  });

  return (
    <View style={[styles.nodeWrap, { left: x - NODE_SIZE / 2, top: y - NODE_SIZE / 2 }]}>
      {isFocus && !lesson.is_locked ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.nodePulse,
            {
              borderColor: topColor,
              opacity: pulseOpacity,
              transform: [{ scale: pulseScale }],
            },
          ]}
        />
      ) : null}

      <View style={[styles.nodeBase, { backgroundColor: baseColor }]} />
      <Animated.View style={{ transform: [{ translateY }, { scale }] }}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.nodeFace,
            {
              backgroundColor: topColor,
              borderColor: state === "locked" ? borderColor : topColor,
            },
          ]}
        >
          <Ionicons name={iconName} size={20} color={palette.white} />
        </Pressable>
      </Animated.View>
    </View>
  );
});

export default function TrailDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const token = useAuthStore((state) => state.token);
  const profile = useAuthStore((state) => state.profile);
  const { colors, isDark } = useAppTheme();

  const [selectedLesson, setSelectedLesson] = useState<TrailLesson | null>(null);
  const [roadmapWidth, setRoadmapWidth] = useState(0);

  const trailQuery = useQuery({
    queryKey: ["trail-detail", slug, token],
    queryFn: () => getTrailBySlug(token!, slug),
    enabled: !!token && !!slug,
  });

  const lessons = trailQuery.data?.data.lessons ?? [];
  const positions = useMemo(() => buildNodePositions(lessons.length, roadmapWidth), [lessons.length, roadmapWidth]);
  const roadmapHeight = Math.max(lessons.length * 116 + 110, 260);
  const focusLessonSlug = useMemo(
    () => lessons.find((lesson) => !lesson.is_locked && !lesson.is_completed)?.slug ?? lessons.find((lesson) => !lesson.is_locked)?.slug ?? null,
    [lessons]
  );

  const handleRoadmapLayout = (event: LayoutChangeEvent) => {
    const width = Math.round(event.nativeEvent.layout.width);
    if (width > 0 && width !== roadmapWidth) {
      setRoadmapWidth(width);
    }
  };

  const closeLessonModal = () => {
    setSelectedLesson(null);
  };

  const startSelectedLesson = () => {
    if (!selectedLesson?.slug || selectedLesson.is_locked) {
      return;
    }

    const lessonSlug = selectedLesson.slug;
    closeLessonModal();
    router.push(`/lesson/${lessonSlug}`);
  };

  return (
    <GradientScreen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topRow}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          >
            <Ionicons name="arrow-back" size={18} color={colors.primary} />
          </Pressable>
          <Text style={[styles.topTitle, { color: colors.textPrimary }]}>Detalhe da trilha</Text>
          <View style={styles.topEnergy}>
            <EnergyChip value={profile?.energy ?? 0} />
          </View>
        </View>

        {trailQuery.isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={palette.blue700} />
            <Text style={styles.centeredText}>Carregando trilha...</Text>
          </View>
        ) : null}

        {trailQuery.isError ? <Text style={styles.errorText}>Nao foi possivel abrir esta trilha.</Text> : null}

        {trailQuery.data ? (
          <>
            <View style={[styles.heroCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Text style={[styles.subject, { color: colors.primary }]}>{trailQuery.data.data.subject.name}</Text>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{trailQuery.data.data.title}</Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>{trailQuery.data.data.description}</Text>
            </View>

            <View
              onLayout={handleRoadmapLayout}
              style={[
                styles.roadmapContainer,
                {
                  height: roadmapHeight,
                  backgroundColor: colors.cardBackground,
                  borderRadius: 20,
                },
              ]}
            >
              {positions.slice(0, -1).map((point, index) => {
                const next = positions[index + 1];
                const dx = next.x - point.x;
                const dy = next.y - point.y;
                const length = Math.hypot(dx, dy);
                const angle = Math.atan2(dy, dx);
                const isSegmentProgressed = !!lessons[index]?.is_completed;
                const segmentColor = isSegmentProgressed
                  ? isDark
                    ? "#1E9E6A"
                    : "#1DBC80"
                  : isDark
                    ? "rgba(140, 196, 255, 0.42)"
                    : palette.blue300;

                return (
                  <View
                    key={`seg-${index}`}
                    style={[
                      styles.roadSegment,
                      {
                        left: point.x,
                        top: point.y,
                        width: length,
                        backgroundColor: segmentColor,
                        transform: [{ translateY: -ROAD_STROKE / 2 }, { rotateZ: `${angle}rad` }],
                      },
                    ]}
                  />
                );
              })}

              {lessons.map((lesson, index) => {
                const point = positions[index];
                if (!point) return null;

                return (
                  <LessonNodeButton
                    key={`${lesson.external_id ?? lesson.slug ?? `lesson-${lesson.position}`}`}
                    lesson={lesson}
                    x={point.x}
                    y={point.y}
                    isFocus={lesson.slug === focusLessonSlug}
                    isDark={isDark}
                    primaryColor={colors.primary}
                    borderColor={colors.border}
                    onPress={() => setSelectedLesson(lesson)}
                  />
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>

      <Modal visible={!!selectedLesson} transparent animationType="fade" onRequestClose={closeLessonModal}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeLessonModal} />
          <View style={[styles.modalCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.modalTag, { color: colors.primary }]}>Licao selecionada</Text>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {selectedLesson ? `${selectedLesson.position}. ${selectedLesson.title}` : ""}
            </Text>
            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
              {selectedLesson?.objective ?? ""}
            </Text>

            <View style={styles.modalMetaRow}>
              <View style={[styles.modalMetaChip, { backgroundColor: colors.cardMutedBackground, borderColor: colors.border }]}>
                <Text style={[styles.modalMetaText, { color: colors.textPrimary }]}>
                  {selectedLesson?.is_completed
                    ? "Concluida"
                    : selectedLesson?.is_locked
                      ? "Bloqueada"
                      : "Disponivel"}
                </Text>
              </View>
              <View style={[styles.modalMetaChip, { backgroundColor: colors.cardMutedBackground, borderColor: colors.border }]}>
                <Text style={[styles.modalMetaText, { color: colors.textPrimary }]}>
                  Dificuldade: {difficultyLabel(selectedLesson?.difficulty)}
                </Text>
              </View>
              <View style={[styles.modalMetaChip, { backgroundColor: colors.cardMutedBackground, borderColor: colors.border }]}>
                <Text style={[styles.modalMetaText, { color: colors.textPrimary }]}>+{selectedLesson?.xp_reward ?? 0} XP</Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={closeLessonModal}
                style={({ pressed }) => [
                  styles.modalSecondaryButton,
                  { borderColor: colors.border, backgroundColor: colors.cardBackground },
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={[styles.modalSecondaryButtonText, { color: colors.textPrimary }]}>Fechar</Text>
              </Pressable>

              {selectedLesson?.is_locked ? (
                <View style={[styles.modalLockedState, { backgroundColor: colors.cardMutedBackground, borderColor: colors.border }]}>
                  <Ionicons name="lock-closed" size={16} color={colors.textSecondary} />
                  <Text style={[styles.modalLockedText, { color: colors.textSecondary }]}>Bloqueado</Text>
                </View>
              ) : (
                <Pressable
                  onPress={startSelectedLesson}
                  style={({ pressed }) => [
                    styles.modalPrimaryButton,
                    { backgroundColor: colors.primary },
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.modalPrimaryButtonText}>Comecar</Text>
                </Pressable>
              )}
            </View>

            {selectedLesson?.is_locked ? (
              <Text style={[styles.lockedHint, { color: colors.textSecondary }]}>
                Complete as licoes anteriores para desbloquear esta etapa.
              </Text>
            ) : null}
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
    gap: 14,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  topEnergy: {
    marginLeft: "auto",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.blue200,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    color: palette.slate900,
    fontSize: 18,
    fontWeight: "900",
  },
  heroCard: {
    backgroundColor: palette.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.blue200,
  },
  subject: {
    color: palette.blue700,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    marginTop: 4,
    color: palette.slate900,
    fontSize: 22,
    fontWeight: "900",
  },
  description: {
    marginTop: 8,
    color: palette.slate700,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  roadmapContainer: {
    position: "relative",
    overflow: "visible",
  },
  roadSegment: {
    position: "absolute",
    height: ROAD_STROKE,
    borderRadius: 999,
    transformOrigin: "left center",
  },
  nodeWrap: {
    position: "absolute",
    width: NODE_SIZE,
    height: NODE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  nodePulse: {
    position: "absolute",
    width: NODE_SIZE + 4,
    height: NODE_SIZE + 4,
    borderRadius: (NODE_SIZE + 4) / 2,
    borderWidth: 2,
  },
  nodeBase: {
    position: "absolute",
    width: NODE_SIZE - 2,
    height: NODE_SIZE - 2,
    borderRadius: (NODE_SIZE - 2) / 2,
    top: 5,
  },
  nodeFace: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 12, 28, 0.6)",
  },
  modalCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  modalTag: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  modalDescription: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },
  modalMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  modalMetaChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  modalMetaText: {
    fontSize: 11,
    fontWeight: "800",
  },
  modalActions: {
    marginTop: 4,
    flexDirection: "row",
    gap: 8,
  },
  modalSecondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
  },
  modalSecondaryButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },
  modalPrimaryButton: {
    flex: 1,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
  },
  modalLockedState: {
    flex: 1,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingVertical: 11,
  },
  modalLockedText: {
    fontSize: 13,
    fontWeight: "800",
  },
  modalPrimaryButtonDisabled: {
    backgroundColor: palette.slate300,
  },
  modalPrimaryButtonText: {
    color: palette.white,
    fontSize: 13,
    fontWeight: "900",
  },
  lockedHint: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.86,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 10,
  },
  centeredText: {
    color: palette.slate700,
    fontWeight: "600",
  },
  errorText: {
    color: palette.danger,
    fontSize: 13,
    fontWeight: "700",
  },
});
