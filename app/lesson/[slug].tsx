import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GradientScreen } from "../../src/components/GradientScreen";
import { submitLessonAttempt } from "../../src/services/api/lessons";
import { extractApiError } from "../../src/services/api/client";
import { getLessonQuestions } from "../../src/services/api/questions";
import { useAuthStore } from "../../src/store/auth-store";
import { palette } from "../../src/theme/palette";
import type { LessonAttemptResponse, LessonQuestion } from "../../src/types/api";

export default function LessonQuestionsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const token = useAuthStore((state) => state.token);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const queryClient = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answersByQuestion, setAnswersByQuestion] = useState<Record<string, number>>({});
  const [result, setResult] = useState<LessonAttemptResponse["data"] | null>(null);

  const questionsQuery = useQuery({
    queryKey: ["lesson-questions", slug, token],
    queryFn: () => getLessonQuestions(token!, slug),
    enabled: !!token && !!slug,
  });

  const questions = questionsQuery.data?.data.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const selectedOption = currentQuestion ? answersByQuestion[currentQuestion.external_id] : undefined;
  const isLastQuestion = questions.length > 0 && currentIndex === questions.length - 1;

  const submitPayload = useMemo(
    () => ({
      answers: questions
        .filter((question) => answersByQuestion[question.external_id] !== undefined)
        .map((question) => ({
          question_external_id: question.external_id,
          selected_option: answersByQuestion[question.external_id]!,
        })),
    }),
    [questions, answersByQuestion]
  );

  const submitMutation = useMutation({
    mutationFn: () => submitLessonAttempt(token!, slug, submitPayload),
    onSuccess: async (response) => {
      setResult(response.data);
      await updateProfile(response.data.student_profile);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["trails"] }),
        queryClient.invalidateQueries({ queryKey: ["missions"] }),
        queryClient.invalidateQueries({ queryKey: ["trail-detail"] }),
      ]);
    },
  });

  const handleChooseOption = (question: LessonQuestion, optionIndex: number) => {
    if (submitMutation.isPending) return;

    setAnswersByQuestion((prev) => ({
      ...prev,
      [question.external_id]: optionIndex,
    }));
  };

  const handleContinue = () => {
    if (!currentQuestion || selectedOption === undefined) return;

    if (isLastQuestion) {
      submitMutation.mutate();
      return;
    }

    setCurrentIndex((prev) => prev + 1);
  };

  const handleFinishWithoutQuestions = () => {
    submitMutation.mutate();
  };

  const resetAttempt = () => {
    setResult(null);
    setCurrentIndex(0);
    setAnswersByQuestion({});
  };

  return (
    <GradientScreen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={18} color={palette.blue700} />
          </Pressable>
          <Text style={styles.topTitle}>Licao</Text>
        </View>

        {questionsQuery.isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={palette.blue700} />
            <Text style={styles.centeredText}>Carregando questoes...</Text>
          </View>
        ) : null}

        {questionsQuery.isError ? (
          <Text style={styles.errorText}>Nao foi possivel carregar as questoes desta licao.</Text>
        ) : null}

        {questionsQuery.data ? (
          <>
            <View style={styles.headerCard}>
              <Text style={styles.lessonTitle}>{questionsQuery.data.data.lesson.title}</Text>
              <Text style={styles.lessonObjective}>{questionsQuery.data.data.lesson.objective}</Text>
            </View>

            {result ? (
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>Licao concluida</Text>
                <Text style={styles.resultText}>
                  Voce acertou {result.quiz.correct_answers} de {result.quiz.total_questions} questoes.
                </Text>
                <Text style={styles.resultText}>Pontuacao: {result.quiz.score}%</Text>
                <Text style={styles.resultHighlight}>
                  {result.progress.already_completed
                    ? "Esta licao ja tinha sido concluida antes."
                    : `+${result.progress.earned_xp} XP ganhos.`}
                </Text>

                {result.completed_missions.length > 0 ? (
                  <View style={styles.highlightBlock}>
                    <Text style={styles.highlightTitle}>Missoes concluidas</Text>
                    {result.completed_missions.map((mission, index) => (
                      <Text key={`${mission.title}-${index}`} style={styles.highlightItem}>
                        {mission.title} (+{mission.reward_xp} XP)
                      </Text>
                    ))}
                  </View>
                ) : null}

                {result.unlocked_badges.length > 0 ? (
                  <View style={styles.highlightBlock}>
                    <Text style={styles.highlightTitle}>Badges desbloqueados</Text>
                    {result.unlocked_badges.map((badge, index) => (
                      <Text key={`${badge.name}-${index}`} style={styles.highlightItem}>
                        {badge.name}
                      </Text>
                    ))}
                  </View>
                ) : null}

                <View style={styles.actionsRow}>
                  <Pressable onPress={resetAttempt} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Refazer</Text>
                  </Pressable>
                  <Pressable onPress={() => router.back()} style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>Voltar</Text>
                  </Pressable>
                </View>
              </View>
            ) : questions.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Sem questoes nesta licao</Text>
                <Text style={styles.emptyText}>
                  Voce pode concluir a licao agora e receber o XP base.
                </Text>
                <Pressable
                  onPress={handleFinishWithoutQuestions}
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending ? (
                    <ActivityIndicator color={palette.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Concluir licao</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <View style={styles.questionCard}>
                <Text style={styles.questionCounter}>
                  Questao {currentIndex + 1} de {questions.length}
                </Text>
                <Text style={styles.questionPrompt}>{currentQuestion.prompt}</Text>

                <View style={styles.options}>
                  {currentQuestion.options.map((option, index) => {
                    const selected = selectedOption === index;

                    return (
                      <Pressable
                        key={`${currentQuestion.external_id}-${index}`}
                        onPress={() => handleChooseOption(currentQuestion, index)}
                        style={[styles.option, selected && styles.optionSelected]}
                      >
                        <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.answerCount}>
                  Respondidas: {Object.keys(answersByQuestion).length}/{questions.length}
                </Text>

                {submitMutation.isError ? (
                  <Text style={styles.errorText}>{extractApiError(submitMutation.error)}</Text>
                ) : null}

                <Pressable
                  onPress={handleContinue}
                  disabled={selectedOption === undefined || submitMutation.isPending}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    (selectedOption === undefined || submitMutation.isPending) && styles.primaryButtonDisabled,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  {submitMutation.isPending ? (
                    <ActivityIndicator color={palette.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {isLastQuestion ? "Finalizar licao" : "Proxima questao"}
                    </Text>
                  )}
                </Pressable>
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
    fontSize: 18,
    fontWeight: "900",
  },
  headerCard: {
    backgroundColor: palette.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.blue200,
    padding: 16,
  },
  lessonTitle: {
    color: palette.slate900,
    fontSize: 20,
    fontWeight: "900",
  },
  lessonObjective: {
    marginTop: 8,
    color: palette.slate700,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  questionCard: {
    backgroundColor: palette.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.blue200,
    padding: 16,
    gap: 12,
  },
  questionCounter: {
    color: palette.blue700,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  questionPrompt: {
    color: palette.slate900,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 23,
  },
  options: {
    gap: 8,
  },
  option: {
    borderWidth: 1,
    borderColor: palette.blue200,
    borderRadius: 12,
    backgroundColor: palette.blue100,
    padding: 12,
  },
  optionSelected: {
    borderColor: palette.blue700,
    backgroundColor: palette.blue700,
  },
  optionText: {
    color: palette.slate700,
    fontSize: 14,
    fontWeight: "700",
  },
  optionTextSelected: {
    color: palette.white,
  },
  answerCount: {
    color: palette.slate500,
    fontSize: 12,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: palette.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.blue200,
    padding: 16,
    gap: 12,
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
  resultCard: {
    backgroundColor: palette.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.blue200,
    padding: 16,
    gap: 10,
  },
  resultTitle: {
    color: palette.slate900,
    fontSize: 20,
    fontWeight: "900",
  },
  resultText: {
    color: palette.slate700,
    fontSize: 14,
    fontWeight: "600",
  },
  resultHighlight: {
    color: palette.success,
    fontSize: 14,
    fontWeight: "900",
  },
  highlightBlock: {
    marginTop: 6,
    gap: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.blue200,
    backgroundColor: palette.blue100,
    padding: 10,
  },
  highlightTitle: {
    color: palette.blue700,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  highlightItem: {
    color: palette.slate700,
    fontSize: 13,
    fontWeight: "700",
  },
  actionsRow: {
    marginTop: 8,
    flexDirection: "row",
    gap: 10,
  },
  primaryButton: {
    borderRadius: 12,
    backgroundColor: palette.blue700,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  primaryButtonDisabled: {
    backgroundColor: palette.slate300,
  },
  primaryButtonText: {
    color: palette.white,
    fontSize: 14,
    fontWeight: "800",
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.blue200,
    backgroundColor: palette.white,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: palette.blue700,
    fontSize: 14,
    fontWeight: "800",
  },
  buttonPressed: {
    opacity: 0.85,
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
