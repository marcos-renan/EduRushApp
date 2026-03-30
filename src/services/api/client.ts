import axios from "axios";

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
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
      return "Tempo de conexao esgotado. Verifique a API.";
    }

    if (!error.response) {
      return `Nao foi possivel conectar com a API Laravel (${baseURL}).`;
    }
  }

  return "Ocorreu um erro inesperado.";
}
