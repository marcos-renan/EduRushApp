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

export default function SubjectDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const token = useAuthStore((state) => state.token);
  const profile = useAuthStore((state) => state.profile);
  const { colors } = useAppTheme();

  const trailsQuery = useQuery({
    queryKey: ["subject-trails", slug, token],
    queryFn: () => getTrails(token!),
    enabled: !!token && !!slug,
  });

  const subjectTrails = (trailsQuery.data?.data ?? []).filter((trail) => trail.subject.slug === slug);
  const subjectName = subjectTrails[0]?.subject.name ?? "Materia";

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

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Trilhas disponiveis nesta materia.</Text>

        {trailsQuery.isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={palette.blue700} />
            <Text style={styles.centeredText}>Carregando trilhas...</Text>
          </View>
        ) : null}

        {trailsQuery.isError ? <Text style={styles.errorText}>Nao foi possivel carregar as trilhas desta materia.</Text> : null}

        {!trailsQuery.isLoading && !trailsQuery.isError && subjectTrails.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Nenhuma trilha encontrada</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Esta materia ainda nao possui trilhas ativas para o seu ano.
            </Text>
          </View>
        ) : null}

        <View style={styles.trailsList}>
          {subjectTrails.map((trail) => {
            const percent = trail.lessons_count
              ? Math.round((trail.completed_lessons_count / trail.lessons_count) * 100)
              : 0;

            return (
              <Pressable
                key={`${trail.external_id ?? trail.slug}`}
                style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                onPress={() => router.push(`/trail/${trail.slug}`)}
              >
                <Text style={[styles.title, { color: colors.textPrimary }]}>{trail.title}</Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>{trail.description}</Text>

                <View style={styles.progressRow}>
                  <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                    {trail.completed_lessons_count}/{trail.lessons_count} licoes
                  </Text>
                  <Text style={[styles.progressText, { color: colors.textSecondary }]}>{percent}%</Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.cardMutedBackground }]}>
                  <View style={[styles.progressFill, { width: `${percent}%` }]} />
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
