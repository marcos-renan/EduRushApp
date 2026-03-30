import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GradientScreen } from "../src/components/GradientScreen";
import { getReviewErrors } from "../src/services/api/review";
import { useAuthStore } from "../src/store/auth-store";
import { useAppTheme } from "../src/theme/app-theme";
import { palette } from "../src/theme/palette";

export default function ReviewScreen() {
  const token = useAuthStore((state) => state.token);
  const { colors } = useAppTheme();

  const reviewQuery = useQuery({
    queryKey: ["review-errors", token],
    queryFn: () => getReviewErrors(token!),
    enabled: !!token,
  });

  return (
    <GradientScreen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Ionicons name="arrow-back" size={18} color={colors.primary} />
          </Pressable>
          <Text style={[styles.topTitle, { color: colors.textPrimary }]}>Revisao de Erros</Text>
        </View>

        {reviewQuery.isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={palette.blue700} />
            <Text style={styles.centeredText}>Carregando fila de revisao...</Text>
          </View>
        ) : null}

        {reviewQuery.isError ? (
          <Text style={styles.errorText}>Nao foi possivel carregar a revisao agora.</Text>
        ) : null}

        {reviewQuery.data ? (
          <>
            <View style={styles.summaryCard}>
              <View style={[styles.summaryItem, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Pendentes</Text>
                <Text style={[styles.summaryValue, { color: colors.primary }]}>{reviewQuery.data.meta.pending_count}</Text>
              </View>
              <View style={[styles.summaryItem, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Resolvidos</Text>
                <Text style={[styles.summaryValue, { color: colors.primary }]}>{reviewQuery.data.meta.resolved_count}</Text>
              </View>
            </View>

            {reviewQuery.data.data.pending_errors.length > 0 ? (
              <View style={styles.list}>
                {reviewQuery.data.data.pending_errors.map((error, index) => (
                  <View key={`${error.question_external_id ?? index}`} style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                    <Text style={[styles.subjectText, { color: colors.textMuted }]}>
                      {(error.lesson.subject_name ?? "Materia") + " | " + (error.lesson.title ?? "Licao")}
                    </Text>
                    <Text style={[styles.promptText, { color: colors.textPrimary }]}>{error.question_prompt ?? "Questao sem descricao"}</Text>
                    <Text style={[styles.attemptText, { color: colors.textSecondary }]}>Tentativas com erro: {error.attempts}</Text>
                    <Pressable
                      disabled={!error.lesson.slug}
                      onPress={() => error.lesson.slug && router.push(`/lesson/${error.lesson.slug}`)}
                      style={({ pressed }) => [
                        styles.actionButton,
                        { backgroundColor: colors.primary },
                        !error.lesson.slug && styles.actionButtonDisabled,
                        pressed && !!error.lesson.slug && styles.actionButtonPressed,
                      ]}
                    >
                      <Text style={styles.actionText}>Revisar agora</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Sem erros pendentes</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Excelente trabalho. Continue praticando para manter o ritmo.
                </Text>
              </View>
            )}
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
    fontSize: 20,
    fontWeight: "900",
  },
  summaryCard: {
    flexDirection: "row",
    gap: 10,
  },
  summaryItem: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.blue200,
    backgroundColor: palette.white,
    padding: 14,
    alignItems: "center",
  },
  summaryLabel: {
    color: palette.slate500,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  summaryValue: {
    marginTop: 4,
    color: palette.blue700,
    fontSize: 24,
    fontWeight: "900",
  },
  list: {
    gap: 10,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.blue200,
    backgroundColor: palette.white,
    padding: 14,
    gap: 8,
  },
  subjectText: {
    color: palette.slate500,
    fontSize: 12,
    fontWeight: "700",
  },
  promptText: {
    color: palette.slate900,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },
  attemptText: {
    color: palette.slate700,
    fontSize: 12,
    fontWeight: "700",
  },
  actionButton: {
    marginTop: 2,
    alignSelf: "flex-start",
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
  actionText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: "800",
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.blue200,
    backgroundColor: palette.white,
    padding: 16,
    gap: 8,
  },
  emptyTitle: {
    color: palette.slate900,
    fontSize: 17,
    fontWeight: "900",
  },
  emptyText: {
    color: palette.slate700,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
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
