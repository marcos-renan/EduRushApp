import type { MissionsResponse } from "../../types/api";
import { api, withAuth } from "./client";

export async function getMissions(token: string): Promise<MissionsResponse> {
  const { data } = await api.get<MissionsResponse>("/student/missions", withAuth(token));
  return data;
}
