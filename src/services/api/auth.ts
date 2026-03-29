import { api, withAuth } from "./client";
import type { LoginResponse } from "../../types/api";

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/auth/login", {
    email,
    password,
    device_name: "edurush-expo-app",
  });

  return data;
}

export async function logoutRequest(token: string): Promise<void> {
  await api.post("/auth/logout", {}, withAuth(token));
}
