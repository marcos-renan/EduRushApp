import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { EnergyChip } from "../../src/components/EnergyChip";
import { GradientScreen } from "../../src/components/GradientScreen";
import { LessonsLineChart } from "../../src/components/LessonsLineChart";
import { getFriendsRanking } from "../../src/services/api/friends";
import { getMissions } from "../../src/services/api/missions";
import { getProfile } from "../../src/services/api/profile";
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
      label: "Concluída",
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
      label: "Sem lições ativas",
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

function DashboardMissionCard({
  mission,
  action,
  colors,
}: {
  mission: MissionItem;
  action: MissionAction;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
    <View style={[styles.missionCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={styles.missionHeader}>
        <Text style={[styles.missionType, { color: colors.primary }]}>
          {mission.mission_type === "daily" ? "Diária" : "Semanal"}
        </Text>
        <Text style={[styles.missionStatus, mission.is_completed && styles.missionStatusDone]}>
          {mission.is_completed ? "Concluída" : "Em andamento"}
        </Text>
      </View>
      <Text style={[styles.missionTitle, { color: colors.textPrimary }]}>{mission.title}</Text>
      <Text style={[styles.missionDescription, { color: colors.textSecondary }]}>{mission.description}</Text>

      <View style={styles.missionProgressRow}>
        <Text style={[styles.missionProgressText, { color: colors.textSecondary }]}>
          {mission.progress}/{mission.target}
        </Text>
        <Text style={[styles.missionProgressText, { color: colors.textSecondary }]}>{mission.progress_percent}%</Text>
      </View>

      <View style={[styles.missionProgressBar, { backgroundColor: colors.cardMutedBackground }]}>
        <View style={[styles.missionProgressFill, { width: `${mission.progress_percent}%` }]} />
      </View>

      <View style={styles.missionFooter}>
        <Text style={styles.missionReward}>+{mission.reward_xp} XP</Text>
        <Pressable
          onPress={action.onPress}
          disabled={action.disabled}
          style={({ pressed }) => [
            styles.missionActionButton,
            { backgroundColor: colors.primary },
            action.disabled && styles.missionActionButtonDisabled,
            pressed && !action.disabled && styles.missionActionButtonPressed,
          ]}
        >
          <Text style={styles.missionActionButtonText}>{action.label}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const { colors } = useAppTheme();

  const trailsQuery = useQuery({
    queryKey: ["trails", token],
    queryFn: () => getTrails(token!),
    enabled: !!token,
  });

  const missionsQuery = useQuery({
    queryKey: ["missions", token],
    queryFn: () => getMissions(token!),
    enabled: !!token,
  });

  const rankingQuery = useQuery({
    queryKey: ["friends-ranking", token],
    queryFn: () => getFriendsRanking(token!),
    enabled: !!token,
  });

  const reviewQuery = useQuery({
    queryKey: ["review-errors", token],
    queryFn: () => getReviewErrors(token!),
    enabled: !!token,
  });

  const profileQuery = useQuery({
    queryKey: ["profile", token, "energy-sync"],
    queryFn: () => getProfile(token!),
    enabled: !!token,
    refetchInterval: 60000,
  });

  useEffect(() => {
    const nextProfile = profileQuery.data?.data.student_profile;
    if (!nextProfile) return;

    void updateProfile(nextProfile);
  }, [profileQuery.data, updateProfile]);

  const completedMissionsCount = missionsQuery.data?.meta.completed_missions ?? 0;
  const energy = profile?.energy ?? 0;
  const energyCap = profile?.energy_regen_cap ?? 10;
  const missions = missionsQuery.data?.data ?? [];
  const myRankingRow = rankingQuery.data?.data.find((item) => item.is_me) ?? null;
  const lessonsPerDay = myRankingRow?.stats.lessons_per_day ?? [];
  const nextStudyTarget = findFirstAvailableLesson(trailsQuery.data?.data ?? []);
  const hasPendingReview = (reviewQuery.data?.meta.pending_count ?? 0) > 0;

  const nextRechargeLabel = useMemo(() => {
    if (!profile?.energy_next_recharge_at || energy >= energyCap) {
      return null;
    }

    const diffMs = new Date(profile.energy_next_recharge_at).getTime() - Date.now();

    if (diffMs <= 0) {
      return "Recarregando...";
    }

    const minutesLeft = Math.max(1, Math.ceil(diffMs / 60000));

    return `+1 em ${minutesLeft} min`;
  }, [energy, energyCap, profile?.energy_next_recharge_at]);

  return (
    <GradientScreen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.welcome, { color: colors.textPrimary }]}>Bem-vindo, {user?.name?.split(" ")[0] ?? "Aluno"}!</Text>
            <Text style={[styles.subWelcome, { color: colors.textSecondary }]}>Continue sua jornada no EduRush.</Text>
          </View>
          <EnergyChip value={energy} />
        </View>

        <View style={[styles.heroCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Seu progresso</Text>
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: colors.cardMutedBackground }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>Nv. {profile?.level ?? 1}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Nível</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.cardMutedBackground }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{profile?.total_xp ?? 0}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>XP total</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.cardMutedBackground }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{profile?.current_streak ?? 0}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sequência</Text>
            </View>
          </View>

          <View style={[styles.energyCard, { backgroundColor: colors.cardMutedBackground, borderColor: colors.border }]}>
            <View>
              <Text style={[styles.energyLabel, { color: colors.textSecondary }]}>Energia</Text>
              <Text style={[styles.energyHint, { color: colors.textMuted }]}>
                {nextRechargeLabel ?? (energy >= energyCap ? "Energia cheia" : "Aguardando recarga")}
              </Text>
            </View>
            <View style={styles.energyValueWrap}>
              <Image source={require("../../assets/icons/energy.png")} style={styles.energyIcon} />
              <Text style={[styles.energyValue, { color: colors.primary }]}>{energy}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.chartCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Lições por dia</Text>
          <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Seu ritmo de estudos na última semana.</Text>
          {rankingQuery.isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <LessonsLineChart data={lessonsPerDay} height={150} />
          )}
        </View>

        <View style={styles.quickGrid}>
          <Pressable style={[styles.quickCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]} onPress={() => router.push("/(tabs)/missoes")}>
            <Text style={[styles.quickNumber, { color: colors.primary }]}>{completedMissionsCount}</Text>
            <Text style={[styles.quickTitle, { color: colors.textSecondary }]}>Missões concluídas</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Suas missões</Text>

          {missionsQuery.isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={palette.blue700} />
              <Text style={[styles.centeredText, { color: colors.textSecondary }]}>Carregando missões...</Text>
            </View>
          ) : null}

          {missionsQuery.isError ? <Text style={styles.errorText}>Não foi possível carregar missões.</Text> : null}

          {!missionsQuery.isLoading && missions.length === 0 ? (
            <Text style={[styles.centeredText, { color: colors.textSecondary }]}>Nenhuma missão disponível no momento.</Text>
          ) : null}

          {missions.map((mission) => (
            <DashboardMissionCard
              key={mission.external_id ?? `${mission.mission_key}-${mission.mission_type}`}
              mission={mission}
              action={missionAction(mission, nextStudyTarget, hasPendingReview)}
              colors={colors}
            />
          ))}
        </View>
      </ScrollView>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  welcome: {
    fontSize: 22,
    fontWeight: "900",
    color: palette.slate900,
  },
  subWelcome: {
    marginTop: 4,
    color: palette.slate700,
    fontSize: 14,
    fontWeight: "600",
  },
  heroCard: {
    backgroundColor: palette.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.blue200,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: palette.slate900,
  },
  statsRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  energyCard: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  energyLabel: {
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  energyHint: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
  },
  energyValue: {
    fontSize: 24,
    fontWeight: "900",
  },
  energyValueWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  energyIcon: {
    width: 20,
    height: 20,
  },
  statBox: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: palette.blue100,
    alignItems: "center",
    paddingVertical: 12,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "900",
    color: palette.blue800,
  },
  statLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: palette.slate700,
  },
  quickGrid: {
    gap: 10,
  },
  chartCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  chartSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  quickCard: {
    backgroundColor: palette.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.blue200,
    padding: 16,
  },
  quickNumber: {
    fontSize: 22,
    fontWeight: "900",
    color: palette.blue700,
  },
  quickTitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "700",
    color: palette.slate700,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
  },
  missionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  missionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  missionType: {
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  missionStatus: {
    fontSize: 11,
    color: palette.warning,
    fontWeight: "800",
  },
  missionStatusDone: {
    color: palette.success,
  },
  missionTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  missionDescription: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  missionProgressRow: {
    marginTop: 2,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  missionProgressText: {
    fontSize: 12,
    fontWeight: "700",
  },
  missionProgressBar: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  missionProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: palette.blue700,
  },
  missionFooter: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  missionReward: {
    color: palette.success,
    fontWeight: "900",
    fontSize: 12,
  },
  missionActionButton: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  missionActionButtonDisabled: {
    backgroundColor: palette.slate300,
  },
  missionActionButtonPressed: {
    opacity: 0.85,
  },
  missionActionButtonText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: "800",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  centeredText: {
    fontSize: 13,
    fontWeight: "600",
  },
  errorText: {
    color: palette.danger,
    fontSize: 13,
    fontWeight: "700",
  },
});

