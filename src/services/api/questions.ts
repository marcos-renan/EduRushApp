import type { LessonQuestionsResponse } from "../../types/api";
import { api, withAuth } from "./client";

export async function getLessonQuestions(token: string, lessonSlug: string): Promise<LessonQuestionsResponse> {
  const { data } = await api.get<LessonQuestionsResponse>(
    `/student/lessons/${lessonSlug}/questions`,
    withAuth(token)
  );

  return data;
}
