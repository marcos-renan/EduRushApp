import axios from "axios";

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const timeoutMs = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS ?? "12000");
const apiDebug = process.env.EXPO_PUBLIC_ENABLE_API_DEBUG === "true";

export const api = axios.create({
  baseURL,
  timeout: Number.isFinite(timeoutMs) ? timeoutMs : 12000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

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

    if (error.code === "ECONNABORTED") {
      return "Tempo de conexao esgotado. Verifique a API.";
    }

    if (!error.response) {
      return `Nao foi possivel conectar com a API Laravel (${baseURL}).`;
    }
  }

  return "Ocorreu um erro inesperado.";
}
