import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { EnergyChip } from "../../src/components/EnergyChip";
import { GradientScreen } from "../../src/components/GradientScreen";
import { getMissions } from "../../src/services/api/missions";
import { getProfile } from "../../src/services/api/profile";
import { getTrails } from "../../src/services/api/trails";
import { useAuthStore } from "../../src/store/auth-store";
import { useAppTheme } from "../../src/theme/app-theme";
import { palette } from "../../src/theme/palette";

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

  const missionsCount = missionsQuery.data?.meta.total_missions ?? 0;
  const completedMissionsCount = missionsQuery.data?.meta.completed_missions ?? 0;
  const subjectsCount = new Set((trailsQuery.data?.data ?? []).map((trail) => trail.subject.slug)).size;
  const energy = profile?.energy ?? 0;
  const energyCap = profile?.energy_regen_cap ?? 10;

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
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Nivel</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.cardMutedBackground }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{profile?.total_xp ?? 0}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>XP total</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.cardMutedBackground }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{profile?.current_streak ?? 0}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sequencia</Text>
            </View>
          </View>

          <View style={[styles.energyCard, { backgroundColor: colors.cardMutedBackground, borderColor: colors.border }]}>
            <View>
              <Text style={[styles.energyLabel, { color: colors.textSecondary }]}>Energia</Text>
              <Text style={[styles.energyHint, { color: colors.textMuted }]}>
                {nextRechargeLabel ?? (energy >= energyCap ? "Energia cheia" : "Aguardando recarga")}
              </Text>
            </View>
            <Text style={[styles.energyValue, { color: colors.primary }]}>
              {energy}
            </Text>
          </View>
        </View>

        <View style={styles.quickGrid}>
          <Pressable style={[styles.quickCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]} onPress={() => router.push("/(tabs)/trilhas")}>
            <Text style={[styles.quickNumber, { color: colors.primary }]}>{subjectsCount}</Text>
            <Text style={[styles.quickTitle, { color: colors.textSecondary }]}>Materias ativas</Text>
          </Pressable>
          <Pressable style={[styles.quickCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]} onPress={() => router.push("/(tabs)/missoes")}>
            <Text style={[styles.quickNumber, { color: colors.primary }]}>{missionsCount}</Text>
            <Text style={[styles.quickTitle, { color: colors.textSecondary }]}>Missoes abertas</Text>
          </Pressable>
          <View style={[styles.quickCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.quickNumber, { color: colors.primary }]}>{completedMissionsCount}</Text>
            <Text style={[styles.quickTitle, { color: colors.textSecondary }]}>Missoes concluidas</Text>
          </View>
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
});
