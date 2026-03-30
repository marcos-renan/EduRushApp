import type { ProfileResponse, UpdateProfilePayload } from "../../types/api";
import { api, withAuth } from "./client";

export async function getProfile(token: string): Promise<ProfileResponse> {
  const { data } = await api.get<ProfileResponse>("/student/profile", withAuth(token));
  return data;
}

export async function updateProfile(token: string, payload: UpdateProfilePayload): Promise<ProfileResponse> {
  const { data } = await api.put<ProfileResponse>("/student/profile", payload, withAuth(token));
  return data;
}

type UploadPhotoInput = {
  uri: string;
  name?: string | null;
  mimeType?: string | null;
};

export async function updateProfilePhoto(token: string, input: UploadPhotoInput): Promise<ProfileResponse> {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
  const uploadUrl = `${baseUrl}/student/profile/photo`;

  const formData = new FormData();

  const normalizedName = input.name?.trim() ? input.name : `profile-${Date.now()}.jpg`;
  const normalizedMimeType = input.mimeType?.trim() ? input.mimeType : "image/jpeg";

  formData.append("photo", {
    uri: input.uri,
    name: normalizedName,
    type: normalizedMimeType,
  } as any);

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const rawText = await response.text();
  let payload: any = null;

  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const errorValues = payload?.errors ? (Object.values(payload.errors) as Array<unknown>) : [];
    const firstBucket = errorValues.length > 0 && Array.isArray(errorValues[0]) ? (errorValues[0] as Array<unknown>) : [];
    const firstValidationError = firstBucket.length > 0 && typeof firstBucket[0] === "string"
      ? firstBucket[0]
      : null;
    const message =
      firstValidationError ||
      payload?.message ||
      `Falha ao enviar foto (HTTP ${response.status}).`;
    throw new Error(message);
  }

  return payload as ProfileResponse;
}
