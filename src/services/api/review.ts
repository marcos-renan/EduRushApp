import type { ReviewErrorsResponse } from "../../types/api";
import { api, withAuth } from "./client";

export async function getReviewErrors(token: string): Promise<ReviewErrorsResponse> {
  const { data } = await api.get<ReviewErrorsResponse>("/student/review/errors", withAuth(token));
  return data;
}
