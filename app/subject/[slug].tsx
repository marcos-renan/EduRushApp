import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { EnergyChip } from "../../src/components/EnergyChip";
import { GradientScreen } from "../../src/components/GradientScreen";
import { getTrails } from "../../src/services/api/trails";
import { useAuthStore } from "../../src/store/auth-store";
import { useAppTheme } from "../../src/theme/app-theme";
import { palette } from "../../src/theme/palette";

type DifficultyTier = "easy" | "medium" | "hard";

function mapLessonDifficultyToTier(value?: string): DifficultyTier {
  const normalized = (value ?? "").toLowerCase().trim();

  if (["hard", "advanced", "dificil"].includes(normalized)) return "hard";
  if (["medium", "intermediate", "medio"].includes(normalized)) return "medium";
  return "easy";
}

function resolveTrailDifficulty(trail: { lessons: Array<{ difficulty?: string }>; difficulty?: string }): DifficultyTier {
  const trailDifficulty = (trail.difficulty ?? "").toLowerCase().trim();
  if (trailDifficulty) return mapLessonDifficultyToTier(trailDifficulty);

  if (!trail.lessons?.length) return "easy";

  if (trail.lessons.some((lesson) => mapLessonDifficultyToTier(lesson.difficulty) === "hard")) return "hard";
  if (trail.lessons.some((lesson) => mapLessonDifficultyToTier(lesson.difficulty) === "medium")) return "medium";
  return "easy";
}

function difficultyUi(tier: DifficultyTier, isDark: boolean) {
  if (tier === "hard") {
    return {
      label: "Difícil",
      borderColor: palette.danger,
      backgroundColor: isDark ? "#2A1720" : "#FFF0F3",
      textColor: isDark ? "#FFB6C3" : "#AA2343",
      progressColor: "#F06A85",
    };
  }

  if (tier === "medium") {
    return {
      label: "Médio",
      borderColor: palette.warning,
      backgroundColor: isDark ? "#2D2415" : "#FFF7E6",
      textColor: isDark ? "#FFD999" : "#9A6200",
      progressColor: "#FFBF3D",
    };
  }

  return {
    label: "Fácil",
    borderColor: palette.success,
    backgroundColor: isDark ? "#13281F" : "#ECFAF3",
    textColor: isDark ? "#9BE8C8" : "#0A7A4F",
    progressColor: "#21C489",
  };
}

export default function SubjectDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const token = useAuthStore((state) => state.token);
  const profile = useAuthStore((state) => state.profile);
  const { colors, isDark } = useAppTheme();

  const trailsQuery = useQuery({
    queryKey: ["subject-trails", slug, token],
    queryFn: () => getTrails(token!),
    enabled: !!token && !!slug,
  });

  const subjectTrails = (trailsQuery.data?.data ?? []).filter((trail) => trail.subject.slug === slug);
  const subjectName = subjectTrails[0]?.subject.name ?? "Matéria";

  return (
    <GradientScreen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Ionicons name="arrow-back" size={18} color={colors.primary} />
          </Pressable>
          <Text style={[styles.topTitle, { color: colors.textPrimary }]}>{subjectName}</Text>
          <View style={styles.topEnergy}>
            <EnergyChip value={profile?.energy ?? 0} />
          </View>
        </View>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Trilhas disponíveis nesta matéria.</Text>

        {trailsQuery.isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={palette.blue700} />
            <Text style={styles.centeredText}>Carregando trilhas...</Text>
          </View>
        ) : null}

        {trailsQuery.isError ? <Text style={styles.errorText}>Não foi possível carregar as trilhas desta matéria.</Text> : null}

        {!trailsQuery.isLoading && !trailsQuery.isError && subjectTrails.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Nenhuma trilha encontrada</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Esta matéria ainda não possui trilhas ativas para o seu ano.
            </Text>
          </View>
        ) : null}

        <View style={styles.trailsList}>
          {subjectTrails.map((trail) => {
            const percent = trail.lessons_count
              ? Math.round((trail.completed_lessons_count / trail.lessons_count) * 100)
              : 0;
            const tier = resolveTrailDifficulty(trail);
            const ui = difficultyUi(tier, isDark);

            return (
              <Pressable
                key={`${trail.external_id ?? trail.slug}`}
                style={[
                  styles.card,
                  { backgroundColor: ui.backgroundColor, borderColor: ui.borderColor },
                  trail.is_locked && styles.cardLocked,
                ]}
                disabled={!!trail.is_locked}
                onPress={() => router.push(`/trail/${trail.slug}`)}
              >
                <View style={styles.cardTopRow}>
                  <View style={[styles.difficultyBadge, { borderColor: ui.borderColor, backgroundColor: colors.cardBackground }]}>
                    <Text style={[styles.difficultyBadgeText, { color: ui.textColor }]}>{ui.label}</Text>
                  </View>
                  {trail.is_locked ? (
                    <View style={[styles.lockedBadge, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                      <Ionicons name="lock-closed" size={12} color={colors.textSecondary} />
                      <Text style={[styles.lockedBadgeText, { color: colors.textSecondary }]}>Bloqueada</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.title, { color: colors.textPrimary }]}>{trail.title}</Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>{trail.description}</Text>

                <View style={styles.progressRow}>
                  <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                    {trail.completed_lessons_count}/{trail.lessons_count} lições
                  </Text>
                  <Text style={[styles.progressText, { color: colors.textSecondary }]}>{percent}%</Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.cardMutedBackground }]}>
                  <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: ui.progressColor }]} />
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
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
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  trailsList: {
    gap: 10,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  cardLocked: {
    opacity: 0.72,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  difficultyBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  difficultyBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  lockedBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  lockedBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
  },
  description: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  progressRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressText: {
    fontSize: 12,
    fontWeight: "700",
  },
  progressBar: {
    marginTop: 8,
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: palette.blue700,
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
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
});

