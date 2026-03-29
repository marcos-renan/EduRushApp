import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { GradientScreen } from "../../src/components/GradientScreen";
import { getTrails } from "../../src/services/api/trails";
import { useAuthStore } from "../../src/store/auth-store";
import { palette } from "../../src/theme/palette";
import type { TrailItem } from "../../src/types/api";

export default function TrilhasScreen() {
  const token = useAuthStore((state) => state.token);

  const trailsQuery = useQuery({
    queryKey: ["trails", token],
    queryFn: () => getTrails(token!),
    enabled: !!token,
  });

  const renderTrail = ({ item }: { item: TrailItem }) => {
    const percent = item.lessons_count
      ? Math.round((item.completed_lessons_count / item.lessons_count) * 100)
      : 0;

    return (
      <Pressable style={styles.card} onPress={() => router.push(`/trail/${item.slug}`)}>
        <Text style={styles.subject}>{item.subject.name}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>

        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            {item.completed_lessons_count}/{item.lessons_count} licoes
          </Text>
          <Text style={styles.progressText}>{percent}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${percent}%` }]} />
        </View>
      </Pressable>
    );
  };

  return (
    <GradientScreen>
      <View style={styles.wrapper}>
        <Text style={styles.screenTitle}>Suas Trilhas</Text>
        <Text style={styles.screenSubtitle}>Escolha uma trilha e avance por licoes e questoes.</Text>

        {trailsQuery.isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={palette.blue700} />
            <Text style={styles.centeredText}>Carregando trilhas...</Text>
          </View>
        ) : null}

        {trailsQuery.isError ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>Nao foi possivel carregar as trilhas.</Text>
          </View>
        ) : null}

        {trailsQuery.data ? (
          <FlatList
            data={trailsQuery.data.data}
            keyExtractor={(item) => item.external_id}
            renderItem={renderTrail}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
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
