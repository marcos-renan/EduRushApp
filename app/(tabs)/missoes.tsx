import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { EnergyChip } from "../../src/components/EnergyChip";
import { GradientScreen } from "../../src/components/GradientScreen";
import { getMissions } from "../../src/services/api/missions";
import { getReviewErrors } from "../../src/services/api/review";
import { getTrails } from "../../src/services/api/trails";
import { useAuthStore } from "../../src/store/auth-store";
import { useAppTheme } from "../../src/theme/app-theme";
import { palette } from "../../src/theme/palette";
import type { MissionItem, TrailItem } from "../../src/types/api";

type MissionAction = {
  label: string;
  disabled: boolean;
  onPress: () => void;
};

function findFirstAvailableLesson(trails: TrailItem[]): { lessonSlug: string; trailSlug: string } | null {
  for (const trail of trails) {
    const lesson = trail.lessons.find((item) => !item.is_locked && !item.is_completed);
    if (lesson) {
      return { lessonSlug: lesson.slug, trailSlug: trail.slug };
    }
  }

  for (const trail of trails) {
    const lesson = trail.lessons.find((item) => !item.is_locked);
    if (lesson) {
      return { lessonSlug: lesson.slug, trailSlug: trail.slug };
    }
  }

  if (trails.length > 0) {
    return { lessonSlug: trails[0].lessons[0]?.slug ?? "", trailSlug: trails[0].slug };
  }

  return null;
}

function missionAction(
  mission: MissionItem,
  nextStudyTarget: { lessonSlug: string; trailSlug: string } | null,
  hasPendingReview: boolean
): MissionAction {
  if (mission.is_completed) {
    return {
      label: "Concluida",
      disabled: true,
      onPress: () => undefined,
    };
  }

  if (mission.metric === "errors_resolved") {
    return {
      label: hasPendingReview ? "Revisar agora" : "Sem erros pendentes",
      disabled: !hasPendingReview,
      onPress: () => router.push("/review"),
    };
  }

  if (!nextStudyTarget || !nextStudyTarget.lessonSlug) {
    return {
      label: "Sem licoes ativas",
      disabled: true,
      onPress: () => undefined,
    };
  }

  return {
    label: "Fazer agora",
    disabled: false,
    onPress: () => router.push(`/lesson/${nextStudyTarget.lessonSlug}`),
  };
}

function MissionCard({
  mission,
  action,
  colors,
}: {
  mission: MissionItem;
  action: MissionAction;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={styles.rowBetween}>
        <Text style={[styles.missionType, { color: colors.primary }]}>{mission.mission_type === "daily" ? "Diaria" : "Semanal"}</Text>
        <Text style={[styles.status, mission.is_completed && styles.statusDone]}>
          {mission.is_completed ? "Concluida" : "Em andamento"}
        </Text>
      </View>
      <Text style={[styles.missionTitle, { color: colors.textPrimary }]}>{mission.title}</Text>
      <Text style={[styles.missionDescription, { color: colors.textSecondary }]}>{mission.description}</Text>

      <View style={styles.progressRow}>
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
          {mission.progress}/{mission.target}
        </Text>
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>{mission.progress_percent}%</Text>
      </View>
      <View style={[styles.progressBar, { backgroundColor: colors.cardMutedBackground }]}>
        <View style={[styles.progressFill, { width: `${mission.progress_percent}%` }]} />
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.reward}>+{mission.reward_xp} XP</Text>
        <Pressable
          onPress={action.onPress}
          disabled={action.disabled}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: colors.primary },
            action.disabled && styles.actionButtonDisabled,
            pressed && !action.disabled && styles.actionButtonPressed,
          ]}
        >
          <Text style={styles.actionButtonText}>{action.label}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function MissoesScreen() {
  const token = useAuthStore((state) => state.token);
  const profile = useAuthStore((state) => state.profile);
  const { colors } = useAppTheme();

  const missionsQuery = useQuery({
    queryKey: ["missions", token],
    queryFn: () => getMissions(token!),
    enabled: !!token,
  });

  const trailsQuery = useQuery({
    queryKey: ["trails", token],
    queryFn: () => getTrails(token!),
    enabled: !!token,
  });

  const reviewQuery = useQuery({
    queryKey: ["review-errors", token],
    queryFn: () => getReviewErrors(token!),
    enabled: !!token,
  });

  const daily = missionsQuery.data?.meta.daily_missions ?? [];
  const weekly = missionsQuery.data?.meta.weekly_missions ?? [];
  const nextStudyTarget = findFirstAvailableLesson(trailsQuery.data?.data ?? []);
  const hasPendingReview = (reviewQuery.data?.meta.pending_count ?? 0) > 0;

  return (
    <GradientScreen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topRow}>
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Missoes</Text>
          <EnergyChip value={profile?.energy ?? 0} />
        </View>
        <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>Acompanhe e execute suas missoes por aqui.</Text>

        {missionsQuery.isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={palette.blue700} />
            <Text style={styles.centeredText}>Carregando missoes...</Text>
          </View>
        ) : null}

        {missionsQuery.isError ? <Text style={styles.errorText}>Falha ao carregar missoes.</Text> : null}

        {missionsQuery.data ? (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>Diarias</Text>
              <View style={styles.sectionList}>
                {daily.map((mission) => (
                  <MissionCard
                    key={`${mission.external_id ?? `${mission.mission_key}-daily`}`}
                    mission={mission}
                    action={missionAction(mission, nextStudyTarget, hasPendingReview)}
                    colors={colors}
                  />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>Semanais</Text>
              <View style={styles.sectionList}>
                {weekly.map((mission) => (
                  <MissionCard
                    key={`${mission.external_id ?? `${mission.mission_key}-weekly`}`}
                    mission={mission}
                    action={missionAction(mission, nextStudyTarget, hasPendingReview)}
                    colors={colors}
                  />
                ))}
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
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
    justifyContent: "space-between",
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
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: palette.blue800,
    fontSize: 16,
    fontWeight: "900",
  },
  sectionList: {
    gap: 10,
  },
  card: {
    backgroundColor: palette.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.blue200,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  missionType: {
    fontSize: 12,
    color: palette.blue700,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  status: {
    fontSize: 11,
    color: palette.warning,
    fontWeight: "800",
  },
  statusDone: {
    color: palette.success,
  },
  missionTitle: {
    marginTop: 6,
    fontSize: 16,
    color: palette.slate900,
    fontWeight: "900",
  },
  missionDescription: {
    marginTop: 6,
    color: palette.slate700,
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
    color: palette.slate700,
    fontSize: 12,
    fontWeight: "700",
  },
  progressBar: {
    marginTop: 7,
    height: 8,
    backgroundColor: palette.blue100,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: palette.blue700,
    borderRadius: 999,
  },
  cardFooter: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  reward: {
    color: palette.success,
    fontWeight: "900",
    fontSize: 12,
  },
  actionButton: {
    borderRadius: 10,
    backgroundColor: palette.blue700,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionButtonDisabled: {
    backgroundColor: palette.slate300,
  },
  actionButtonPressed: {
    opacity: 0.85,
  },
  actionButtonText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: "800",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
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
