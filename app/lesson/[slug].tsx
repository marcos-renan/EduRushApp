import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GradientScreen } from "../../src/components/GradientScreen";
import { getLessonQuestions } from "../../src/services/api/questions";
import { useAuthStore } from "../../src/store/auth-store";
import { palette } from "../../src/theme/palette";

export default function LessonQuestionsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const token = useAuthStore((state) => state.token);

  const questionsQuery = useQuery({
    queryKey: ["lesson-questions", slug, token],
    queryFn: () => getLessonQuestions(token!, slug),
    enabled: !!token && !!slug,
  });

  return (
    <GradientScreen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={18} color={palette.blue700} />
          </Pressable>
          <Text style={styles.topTitle}>Questoes da licao</Text>
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

            <View style={styles.list}>
              {questionsQuery.data.data.questions.map((question) => (
                <View key={question.external_id} style={styles.questionCard}>
                  <Text style={styles.questionNumber}>Questao {question.position}</Text>
                  <Text style={styles.questionPrompt}>{question.prompt}</Text>
                  <View style={styles.options}>
                    {question.options.map((option, index) => (
                      <View key={`${question.external_id}-${index}`} style={styles.option}>
                        <Text style={styles.optionText}>{option}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
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
  list: {
    gap: 10,
  },
  questionCard: {
    backgroundColor: palette.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.blue200,
    padding: 14,
    gap: 8,
  },
  questionNumber: {
    color: palette.blue700,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  questionPrompt: {
    color: palette.slate900,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
  },
  options: {
    gap: 8,
    marginTop: 4,
  },
  option: {
    borderWidth: 1,
    borderColor: palette.blue200,
    borderRadius: 10,
    backgroundColor: palette.blue100,
    padding: 10,
  },
  optionText: {
    color: palette.slate700,
    fontSize: 13,
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
