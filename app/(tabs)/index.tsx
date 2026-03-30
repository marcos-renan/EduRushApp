import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GradientScreen } from "../../src/components/GradientScreen";
import { getMissions } from "../../src/services/api/missions";
import { getTrails } from "../../src/services/api/trails";
import { useAuthStore } from "../../src/store/auth-store";
import { useAppTheme } from "../../src/theme/app-theme";
import { palette } from "../../src/theme/palette";

export default function DashboardScreen() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
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

  const missionsCount = missionsQuery.data?.meta.total_missions ?? 0;
  const completedMissionsCount = missionsQuery.data?.meta.completed_missions ?? 0;
  const subjectsCount = new Set((trailsQuery.data?.data ?? []).map((trail) => trail.subject.slug)).size;

  return (
    <GradientScreen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.welcome, { color: colors.textPrimary }]}>Bem-vindo, {user?.name?.split(" ")[0] ?? "Aluno"}!</Text>
            <Text style={[styles.subWelcome, { color: colors.textSecondary }]}>Continue sua jornada no EduRush.</Text>
          </View>
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
