import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { GradientScreen } from "../../src/components/GradientScreen";
import { getMissions } from "../../src/services/api/missions";
import { useAuthStore } from "../../src/store/auth-store";
import { palette } from "../../src/theme/palette";
import type { MissionItem } from "../../src/types/api";

function MissionCard({ mission }: { mission: MissionItem }) {
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.missionType}>{mission.mission_type === "daily" ? "Diaria" : "Semanal"}</Text>
        <Text style={[styles.status, mission.is_completed && styles.statusDone]}>
          {mission.is_completed ? "Concluida" : "Em andamento"}
        </Text>
      </View>
      <Text style={styles.missionTitle}>{mission.title}</Text>
      <Text style={styles.missionDescription}>{mission.description}</Text>

      <View style={styles.progressRow}>
        <Text style={styles.progressText}>
          {mission.progress}/{mission.target}
        </Text>
        <Text style={styles.progressText}>{mission.progress_percent}%</Text>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${mission.progress_percent}%` }]} />
      </View>
      <Text style={styles.reward}>+{mission.reward_xp} XP</Text>
    </View>
  );
}

export default function MissoesScreen() {
  const token = useAuthStore((state) => state.token);

  const missionsQuery = useQuery({
    queryKey: ["missions", token],
    queryFn: () => getMissions(token!),
    enabled: !!token,
  });

  const daily = missionsQuery.data?.meta.daily_missions ?? [];
  const weekly = missionsQuery.data?.meta.weekly_missions ?? [];

  return (
    <GradientScreen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.screenTitle}>Missoes</Text>
        <Text style={styles.screenSubtitle}>Complete desafios e ganhe XP extra.</Text>

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
              <Text style={styles.sectionTitle}>Diarias</Text>
              <View style={styles.sectionList}>
                {daily.map((mission) => (
                  <MissionCard key={mission.external_id} mission={mission} />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Semanais</Text>
              <View style={styles.sectionList}>
                {weekly.map((mission) => (
                  <MissionCard key={mission.external_id} mission={mission} />
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
  reward: {
    marginTop: 10,
    color: palette.success,
    fontWeight: "900",
    fontSize: 12,
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
