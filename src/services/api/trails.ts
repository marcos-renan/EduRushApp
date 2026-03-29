import type { TrailDetailResponse, TrailsResponse } from "../../types/api";
import { api, withAuth } from "./client";

export async function getTrails(token: string): Promise<TrailsResponse> {
  const { data } = await api.get<TrailsResponse>("/student/trails", withAuth(token));
  return data;
}

export async function getTrailBySlug(token: string, slug: string): Promise<TrailDetailResponse> {
  const { data } = await api.get<TrailDetailResponse>(`/student/trails/${slug}`, withAuth(token));
  return data;
}
