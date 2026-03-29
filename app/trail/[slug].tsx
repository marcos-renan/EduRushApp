import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GradientScreen } from "../../src/components/GradientScreen";
import { getTrailBySlug } from "../../src/services/api/trails";
import { useAuthStore } from "../../src/store/auth-store";
import { palette } from "../../src/theme/palette";

export default function TrailDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const token = useAuthStore((state) => state.token);

  const trailQuery = useQuery({
    queryKey: ["trail-detail", slug, token],
    queryFn: () => getTrailBySlug(token!, slug),
    enabled: !!token && !!slug,
  });

  return (
    <GradientScreen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={18} color={palette.blue700} />
          </Pressable>
          <Text style={styles.topTitle}>Detalhe da trilha</Text>
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
            <View style={styles.heroCard}>
              <Text style={styles.subject}>{trailQuery.data.data.subject.name}</Text>
              <Text style={styles.title}>{trailQuery.data.data.title}</Text>
              <Text style={styles.description}>{trailQuery.data.data.description}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Licoes</Text>
              <View style={styles.lessonList}>
                {trailQuery.data.data.lessons.map((lesson) => (
                  <View key={lesson.external_id} style={styles.lessonCard}>
                    <View style={styles.lessonHeader}>
                      <Text style={styles.lessonTitle}>
                        {lesson.position}. {lesson.title}
                      </Text>
                      <Text style={[styles.lessonStatus, lesson.is_completed && styles.lessonCompleted]}>
                        {lesson.is_completed ? "Concluida" : lesson.is_locked ? "Bloqueada" : "Disponivel"}
                      </Text>
                    </View>
                    <Text style={styles.lessonObjective}>{lesson.objective}</Text>
                    <View style={styles.lessonFooter}>
                      <Text style={styles.lessonXp}>+{lesson.xp_reward} XP</Text>
                      <Pressable
                        disabled={lesson.is_locked}
                        onPress={() => router.push(`/lesson/${lesson.slug}`)}
                        style={[styles.openButton, lesson.is_locked && styles.openButtonDisabled]}
                      >
                        <Text style={styles.openButtonText}>Questoes</Text>
                      </Pressable>
                    </View>
                  </View>
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
    gap: 10,
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
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: palette.blue800,
    fontSize: 16,
    fontWeight: "900",
  },
  lessonList: {
    gap: 10,
  },
  lessonCard: {
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.blue200,
  },
  lessonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  lessonTitle: {
    flex: 1,
    color: palette.slate900,
    fontSize: 15,
    fontWeight: "900",
  },
  lessonStatus: {
    color: palette.warning,
    fontSize: 11,
    fontWeight: "800",
  },
  lessonCompleted: {
    color: palette.success,
  },
  lessonObjective: {
    marginTop: 8,
    color: palette.slate700,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 17,
  },
  lessonFooter: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lessonXp: {
    color: palette.blue700,
    fontSize: 12,
    fontWeight: "900",
  },
  openButton: {
    borderRadius: 10,
    backgroundColor: palette.blue700,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  openButtonDisabled: {
    backgroundColor: palette.slate300,
  },
  openButtonText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: "800",
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
