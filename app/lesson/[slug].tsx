import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAudioPlayer } from "expo-audio";
import { router, useLocalSearchParams } from "expo-router";
import LottieView from "lottie-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { EnergyChip } from "../../src/components/EnergyChip";
import { GradientScreen } from "../../src/components/GradientScreen";
import { submitLessonAttempt } from "../../src/services/api/lessons";
import { extractApiError } from "../../src/services/api/client";
import { getLessonQuestions } from "../../src/services/api/questions";
import { useAuthStore } from "../../src/store/auth-store";
import { useAppTheme } from "../../src/theme/app-theme";
import { palette } from "../../src/theme/palette";
import type { LessonAttemptResponse, LessonQuestion } from "../../src/types/api";

export default function LessonQuestionsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const token = useAuthStore((state) => state.token);
  const profile = useAuthStore((state) => state.profile);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const { colors, isDark } = useAppTheme();
  const queryClient = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answersByQuestion, setAnswersByQuestion] = useState<Record<string, number>>({});
  const [checkedByQuestion, setCheckedByQuestion] = useState<Record<string, boolean>>({});
  const [isCorrectByQuestion, setIsCorrectByQuestion] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<LessonAttemptResponse["data"] | null>(null);
  const playedPassSoundRef = useRef(false);
  const correctPlayer = useAudioPlayer(require("../../assets/sounds/correct.mpeg"), {
    keepAudioSessionActive: true,
  });
  const wrongPlayer = useAudioPlayer(require("../../assets/sounds/wrong.mpeg"), {
    keepAudioSessionActive: true,
  });
  const winPlayer = useAudioPlayer(require("../../assets/sounds/win.mpeg"), {
    keepAudioSessionActive: true,
  });

  useEffect(() => {
    wrongPlayer.volume = 1;
    winPlayer.volume = 0.95;
  }, [wrongPlayer, winPlayer]);

  const playCheckSound = async (isCorrect: boolean) => {
    const player = isCorrect ? correctPlayer : wrongPlayer;

    try {
      await player.seekTo(0);
      player.play();
    } catch (error) {
      console.warn("Não foi possível tocar o som de feedback.", error);
    }
  };

  const questionsQuery = useQuery({
    queryKey: ["lesson-questions", slug, token],
    queryFn: () => getLessonQuestions(token!, slug),
    enabled: !!token && !!slug,
  });

  const questions = questionsQuery.data?.data.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const selectedOption = currentQuestion ? answersByQuestion[currentQuestion.external_id] : undefined;
  const isCurrentChecked = currentQuestion ? !!checkedByQuestion[currentQuestion.external_id] : false;
  const isCurrentCorrect = currentQuestion ? isCorrectByQuestion[currentQuestion.external_id] : false;
  const isLastQuestion = questions.length > 0 && currentIndex === questions.length - 1;
  const hasPassed = !!result && result.quiz.score >= 70;
  const hasFailed = !!result && result.quiz.score < 70;

  useEffect(() => {
    const profileFromQuestions = questionsQuery.data?.data.student_profile;
    if (!profileFromQuestions) return;

    void updateProfile(profileFromQuestions);
  }, [questionsQuery.data, updateProfile]);

  useEffect(() => {
    if (!result) {
      playedPassSoundRef.current = false;
      return;
    }

    if (hasPassed && !playedPassSoundRef.current) {
      playedPassSoundRef.current = true;
      void (async () => {
        try {
          await winPlayer.seekTo(0);
          winPlayer.play();
        } catch (error) {
          console.warn("Não foi possível tocar o som de vitória.", error);
        }
      })();
    }
  }, [hasPassed, result, winPlayer]);

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
    if (submitMutation.isPending || checkedByQuestion[question.external_id]) return;

    setAnswersByQuestion((prev) => ({
      ...prev,
      [question.external_id]: optionIndex,
    }));
  };

  const handlePrimaryButtonPress = () => {
    if (!currentQuestion || selectedOption === undefined) return;

    if (!checkedByQuestion[currentQuestion.external_id]) {
      const answerIsCorrect = selectedOption === currentQuestion.correct_option;

      setCheckedByQuestion((prev) => ({
        ...prev,
        [currentQuestion.external_id]: true,
      }));

      setIsCorrectByQuestion((prev) => ({
        ...prev,
        [currentQuestion.external_id]: answerIsCorrect,
      }));

      void playCheckSound(answerIsCorrect);
      return;
    }

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
    setCheckedByQuestion({});
    setIsCorrectByQuestion({});
  };

  return (
    <GradientScreen>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.topRow}>
            <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Ionicons name="arrow-back" size={18} color={colors.primary} />
            </Pressable>
            <Text style={[styles.topTitle, { color: colors.textPrimary }]}>Licao</Text>
            <View style={styles.topEnergy}>
              <EnergyChip value={profile?.energy ?? 0} />
            </View>
          </View>

          {questionsQuery.isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={palette.blue700} />
              <Text style={styles.centeredText}>Carregando questões...</Text>
            </View>
          ) : null}

          {questionsQuery.isError ? (
            <Text style={styles.errorText}>{extractApiError(questionsQuery.error)}</Text>
          ) : null}

          {questionsQuery.data ? (
            <>
              <View style={[styles.headerCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <Text style={[styles.lessonTitle, { color: colors.textPrimary }]}>{questionsQuery.data.data.lesson.title}</Text>
                <Text style={[styles.lessonObjective, { color: colors.textSecondary }]}>{questionsQuery.data.data.lesson.objective}</Text>
              </View>

              {result ? (
                hasPassed ? (
                  <View style={[styles.resultCard, styles.passCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                    <LottieView
                      source={require("../../assets/animations/trophy.json")}
                      autoPlay
                      loop={false}
                      style={styles.trophyAnimation}
                    />
                    <Text style={styles.passTitle}>Parabéns você passou!</Text>
                    <Text style={[styles.passSubtitle, isDark && styles.passDarkText]}>
                      Excelente desempenho nesta lição.
                    </Text>

                    <Text style={[styles.resultText, styles.resultTextCentered, isDark && styles.passDarkText]}>
                      Você acertou {result.quiz.correct_answers} de {result.quiz.total_questions} questões.
                    </Text>
                    <Text style={[styles.resultText, styles.resultTextCentered, isDark && styles.passDarkText]}>
                      Pontuação: {result.quiz.score}%
                    </Text>
                    <Text style={[styles.resultHighlight, styles.resultTextCentered]}>
                      {result.progress.already_completed
                        ? "Esta lição já tinha sido concluida antes."
                        : `+${result.progress.earned_xp} XP ganhos.`}
                    </Text>

                    {result.completed_missions.length > 0 ? (
                      <View style={[styles.highlightBlock, { borderColor: colors.border, backgroundColor: colors.cardMutedBackground }]}>
                        <Text style={styles.highlightTitle}>Missoes concluidas</Text>
                        {result.completed_missions.map((mission, index) => (
                          <Text key={`${mission.title}-${index}`} style={styles.highlightItem}>
                            {mission.title} (+{mission.reward_xp} XP)
                          </Text>
                        ))}
                      </View>
                    ) : null}

                    {result.unlocked_badges.length > 0 ? (
                      <View style={[styles.highlightBlock, { borderColor: colors.border, backgroundColor: colors.cardMutedBackground }]}>
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
                ) : hasFailed ? (
                  <View style={[styles.resultCard, styles.failCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                    <Image
                      source={require("../../assets/images/defeat.png")}
                      style={styles.defeatImage}
                      resizeMode="contain"
                    />
                    <Text style={[styles.failTitle, { color: colors.textPrimary }]}>Infelizmente não foi dessa vez!</Text>
                    <Text style={[styles.failSubtitle, { color: colors.textSecondary }]}>Mas você pode tentar mais uma vez!</Text>

                    <View style={styles.actionsRow}>
                      <Pressable onPress={resetAttempt} style={styles.secondaryButton}>
                        <Text style={styles.secondaryButtonText}>Tentar denovo</Text>
                      </Pressable>
                      <Pressable onPress={() => router.back()} style={styles.primaryButton}>
                        <Text style={styles.primaryButtonText}>Voltar</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null
              ) : questions.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                  <Text style={styles.emptyTitle}>Sem questões nesta lição</Text>
                  <Text style={styles.emptyText}>
                    Você pode concluir a lição agora e receber o XP base.
                  </Text>
                  <Pressable
                    onPress={handleFinishWithoutQuestions}
                    style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
                    disabled={submitMutation.isPending}
                  >
                    {submitMutation.isPending ? (
                      <ActivityIndicator color={palette.white} />
                    ) : (
                      <Text style={styles.primaryButtonText}>Concluir lição</Text>
                    )}
                  </Pressable>
                </View>
              ) : (
                <View style={[styles.questionCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                  <Text style={styles.questionCounter}>
                    Questao {currentIndex + 1} de {questions.length}
                  </Text>
                  <Text style={[styles.questionPrompt, { color: colors.textPrimary }]}>{currentQuestion.prompt}</Text>

                  <View style={styles.options}>
                    {currentQuestion.options.map((option, index) => {
                      const selected = selectedOption === index;
                      const isCorrectOption = isCurrentChecked && index === currentQuestion.correct_option;
                      const isWrongSelected = isCurrentChecked && selected && index !== currentQuestion.correct_option;

                      return (
                        <Pressable
                          key={`${currentQuestion.external_id}-${index}`}
                          onPress={() => handleChooseOption(currentQuestion, index)}
                          style={[
                            styles.option,
                            { borderColor: colors.border, backgroundColor: colors.cardMutedBackground },
                            selected && styles.optionSelected,
                            isCorrectOption && styles.optionCorrect,
                            isWrongSelected && styles.optionWrong,
                          ]}
                        >
                          <Text
                            style={[
                              styles.optionText,
                              { color: colors.textSecondary },
                              selected && styles.optionTextSelected,
                              (isCorrectOption || isWrongSelected) && styles.optionTextChecked,
                            ]}
                          >
                            {option}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={styles.answerCount}>
                    Respondidas: {Object.keys(answersByQuestion).length}/{questions.length}
                  </Text>

                  {isCurrentChecked ? (
                    <Text style={[styles.checkFeedback, isCurrentCorrect ? styles.checkFeedbackSuccess : styles.checkFeedbackError]}>
                      {isCurrentCorrect ? "Resposta correta!" : "Resposta incorreta."}
                    </Text>
                  ) : null}

                  {submitMutation.isError ? (
                    <Text style={styles.errorText}>{extractApiError(submitMutation.error)}</Text>
                  ) : null}

                  <Pressable
                    onPress={handlePrimaryButtonPress}
                    disabled={selectedOption === undefined || submitMutation.isPending}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      {
                        backgroundColor: isCurrentChecked
                          ? isCurrentCorrect
                            ? "#2f855a"
                            : "#de5a5a"
                          : colors.primary,
                      },
                      (selectedOption === undefined || submitMutation.isPending) && styles.primaryButtonDisabled,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    {submitMutation.isPending ? (
                      <ActivityIndicator color={palette.white} />
                    ) : isCurrentChecked ? (
                      <View style={styles.buttonContent}>
                        <LottieView
                          key={`${currentQuestion.external_id}-${isCurrentCorrect ? "success" : "error"}`}
                          source={
                            isCurrentCorrect
                              ? require("../../assets/animations/success.json")
                              : require("../../assets/animations/error.json")
                          }
                          autoPlay
                          loop={false}
                          style={[
                            styles.buttonAnimation,
                            !isCurrentCorrect && styles.buttonAnimationError,
                          ]}
                        />
                        <Text style={styles.primaryButtonText}>Continuar</Text>
                      </View>
                    ) : (
                      <Text style={styles.primaryButtonText}>Verificar</Text>
                    )}
                  </Pressable>
                </View>
              )}
            </>
          ) : null}
        </ScrollView>

        {hasPassed ? (
          <View pointerEvents="none" style={styles.confettiOverlay}>
            <LottieView
              source={require("../../assets/animations/confetti.json")}
              autoPlay
              loop={false}
              style={styles.confettiAnimation}
            />
          </View>
        ) : null}
      </View>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
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
  topEnergy: {
    marginLeft: "auto",
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
  optionTextChecked: {
    color: palette.white,
  },
  optionCorrect: {
    borderColor: "#16a34a",
    backgroundColor: "#15803d",
  },
  optionWrong: {
    borderColor: palette.danger,
    backgroundColor: "#b91c1c",
  },
  answerCount: {
    color: palette.slate500,
    fontSize: 12,
    fontWeight: "700",
  },
  checkFeedback: {
    fontSize: 13,
    fontWeight: "800",
  },
  checkFeedbackSuccess: {
    color: palette.success,
  },
  checkFeedbackError: {
    color: palette.danger,
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
  passCard: {
    alignItems: "center",
  },
  failCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  defeatImage: {
    width: 180,
    height: 180,
    marginBottom: 8,
  },
  failTitle: {
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  failSubtitle: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  trophyAnimation: {
    width: 180,
    height: 180,
    marginTop: -8,
    marginBottom: -6,
  },
  passTitle: {
    color: "#ffb43f",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  passSubtitle: {
    color: palette.slate700,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  passDarkText: {
    color: palette.white,
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
  resultTextCentered: {
    textAlign: "center",
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
    width: "100%",
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
    height: 48,
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
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonAnimation: {
    width: 28,
    height: 28,
    transform: [{ scale: 1.9 }],
  },
  buttonAnimationError: {
    transform: [{ scale: 2.35 }],
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
  confettiOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
  confettiAnimation: {
    width: "100%",
    height: "100%",
  },
});
