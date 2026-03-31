import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { EnergyChip } from "../../src/components/EnergyChip";
import { GradientScreen } from "../../src/components/GradientScreen";
import { getTrails } from "../../src/services/api/trails";
import { useAuthStore } from "../../src/store/auth-store";
import { useAppTheme } from "../../src/theme/app-theme";
import { palette } from "../../src/theme/palette";
import type { TrailItem } from "../../src/types/api";

type SubjectGroup = {
  external_id: string;
  name: string;
  slug: string;
  trails_count: number;
  lessons_count: number;
  completed_lessons_count: number;
  progress_percent: number;
};

function groupTrailsBySubject(trails: TrailItem[]): SubjectGroup[] {
  const grouped = new Map<string, SubjectGroup>();

  for (const trail of trails) {
    const key = trail.subject.slug || trail.subject.external_id;
    const current = grouped.get(key);

    if (!current) {
      grouped.set(key, {
        external_id: trail.subject.external_id,
        name: trail.subject.name,
        slug: trail.subject.slug,
        trails_count: 1,
        lessons_count: trail.lessons_count,
        completed_lessons_count: trail.completed_lessons_count,
        progress_percent: 0,
      });
      continue;
    }

    current.trails_count += 1;
    current.lessons_count += trail.lessons_count;
    current.completed_lessons_count += trail.completed_lessons_count;
  }

  const result = Array.from(grouped.values()).map((item) => {
    const progress = item.lessons_count > 0
      ? Math.round((item.completed_lessons_count / item.lessons_count) * 100)
      : 0;

    return {
      ...item,
      progress_percent: progress,
    };
  });

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export default function MateriasScreen() {
  const token = useAuthStore((state) => state.token);
  const profile = useAuthStore((state) => state.profile);
  const { colors } = useAppTheme();

  const trailsQuery = useQuery({
    queryKey: ["trails", token],
    queryFn: () => getTrails(token!),
    enabled: !!token,
  });

  const subjects = groupTrailsBySubject(trailsQuery.data?.data ?? []);

  const renderSubject = ({ item }: { item: SubjectGroup }) => {
    const percent = item.progress_percent;

    return (
      <Pressable style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]} onPress={() => router.push(`/subject/${item.slug}`)}>
        <Text style={[styles.subject, { color: colors.primary }]}>Materia</Text>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{item.name}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {item.trails_count} trilha(s) disponivel(is) para voce estudar.
        </Text>

        <View style={styles.progressRow}>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {item.completed_lessons_count}/{item.lessons_count} licoes concluidas
          </Text>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>{percent}%</Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: colors.cardMutedBackground }]}>
          <View style={[styles.progressFill, { width: `${percent}%` }]} />
        </View>
      </Pressable>
    );
  };

  return (
    <GradientScreen>
      <View style={styles.wrapper}>
        <View style={styles.topRow}>
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Materias</Text>
          <EnergyChip value={profile?.energy ?? 0} />
        </View>
        <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>Escolha uma materia para ver as trilhas e iniciar as licoes.</Text>

        {trailsQuery.isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={palette.blue700} />
            <Text style={styles.centeredText}>Carregando materias...</Text>
          </View>
        ) : null}

        {trailsQuery.isError ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>Nao foi possivel carregar as materias.</Text>
          </View>
        ) : null}

        {trailsQuery.data ? (
          <FlatList
            data={subjects}
            keyExtractor={(item) => `${item.external_id ?? item.slug}`}
            renderItem={renderSubject}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={styles.centeredText}>Nenhuma materia disponivel no momento.</Text>
              </View>
            }
          />
        ) : null}
      </View>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
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
    marginTop: 4,
    color: palette.slate700,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 14,
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: palette.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.blue200,
  },
  subject: {
    color: palette.blue700,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  title: {
    marginTop: 4,
    color: palette.slate900,
    fontSize: 18,
    fontWeight: "900",
  },
  description: {
    marginTop: 8,
    color: palette.slate700,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  progressRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressText: {
    color: palette.slate700,
    fontSize: 12,
    fontWeight: "700",
  },
  progressBar: {
    marginTop: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: palette.blue100,
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
    fontSize: 14,
    fontWeight: "600",
  },
  errorText: {
    color: palette.danger,
    fontSize: 14,
    fontWeight: "700",
  },
});
