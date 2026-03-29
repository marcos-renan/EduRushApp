import type { LessonAttemptPayload, LessonAttemptResponse } from "../../types/api";
import { api, withAuth } from "./client";

export async function submitLessonAttempt(
  token: string,
  lessonSlug: string,
  payload: LessonAttemptPayload
): Promise<LessonAttemptResponse> {
  const { data } = await api.post<LessonAttemptResponse>(
    `/student/lessons/${lessonSlug}/submit`,
    payload,
    withAuth(token)
  );

  return data;
}
