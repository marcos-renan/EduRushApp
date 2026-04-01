import axios from "axios";
import Constants from "expo-constants";

function resolveExpoDevHost(): string | null {
  if (!__DEV__) return null;

  const hostUri =
    (Constants.expoConfig as { hostUri?: string } | null | undefined)?.hostUri ??
    ((Constants as unknown as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost ?? null) ??
    ((Constants as unknown as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } }).manifest2?.extra?.expoGo?.debuggerHost ??
      null);

  if (!hostUri || typeof hostUri !== "string") {
    return null;
  }

  const host = hostUri.split(":")[0]?.trim();
  if (!host) return null;

  const isLocalLike = host === "localhost" || host === "127.0.0.1" || /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  return isLocalLike ? host : null;
}

function resolveBaseUrl() {
  const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, "");
  }

  const scheme = process.env.EXPO_PUBLIC_API_SCHEME?.trim() || "http";
  const host = resolveExpoDevHost() ?? process.env.EXPO_PUBLIC_API_HOST?.trim() ?? "127.0.0.1";
  const port = process.env.EXPO_PUBLIC_API_PORT?.trim() || "8000";
  const prefixRaw = process.env.EXPO_PUBLIC_API_PREFIX?.trim() || "/api/v1";
  const prefix = `/${prefixRaw.replace(/^\/+/, "").replace(/\/+$/, "")}`;

  return `${scheme}://${host}:${port}${prefix}`;
}

export const API_BASE_URL = resolveBaseUrl();
const baseURL = API_BASE_URL;
const timeoutMs = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS ?? "12000");
const apiDebug = process.env.EXPO_PUBLIC_ENABLE_API_DEBUG === "true";

export const api = axios.create({
  baseURL,
  timeout: Number.isFinite(timeoutMs) ? timeoutMs : 12000,
  headers: {
    Accept: "application/json",
  },
});

export function resolveApiAssetUrl(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) return null;

  try {
    const apiUrl = new URL(baseURL);

    if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
      const assetUrl = new URL(pathOrUrl);

      if (assetUrl.hostname === "localhost" || assetUrl.hostname === "127.0.0.1") {
        return `${apiUrl.protocol}//${apiUrl.host}${assetUrl.pathname}${assetUrl.search}`;
      }

      return pathOrUrl;
    }

    const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
    return `${apiUrl.protocol}//${apiUrl.host}${normalizedPath}`;
  } catch {
    return pathOrUrl;
  }
}

if (apiDebug) {
  api.interceptors.request.use((config) => {
    const method = (config.method ?? "GET").toUpperCase();
    console.log(`[API] ${method} ${config.baseURL}${config.url}`);
    return config;
  });

  api.interceptors.response.use(
    (response) => {
      console.log(`[API] ${response.status} ${response.config.url}`);
      return response;
    },
    (error) => {
      console.log(`[API] ERROR ${error?.response?.status ?? "NO_RESPONSE"} ${error?.config?.url ?? ""}`);
      return Promise.reject(error);
    }
  );
}

export function withAuth(token: string) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

export function extractApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message;
    if (message) return message;

    const validationErrors = (error.response?.data as { errors?: Record<string, string[]> } | undefined)?.errors;
    if (validationErrors) {
      const firstKey = Object.keys(validationErrors)[0];
      const firstMessage = firstKey ? validationErrors[firstKey]?.[0] : null;
      if (firstMessage) return firstMessage;
    }

    if (error.code === "ECONNABORTED") {
      return "Tempo de conexão esgotado. Verifique a API.";
    }

    if (!error.response) {
      return `Não foi possível conectar com a API Laravel (${baseURL}).`;
    }
  }

  return "Ocorreu um erro inesperado.";
}

