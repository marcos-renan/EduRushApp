import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";

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

function normalizePrefix(prefixRaw: string) {
  return `/${prefixRaw.replace(/^\/+/, "").replace(/\/+$/, "")}`;
}

function buildBaseUrl({
  scheme,
  host,
  port,
  prefix,
}: {
  scheme: string;
  host: string;
  port: string;
  prefix: string;
}) {
  return `${scheme}://${host}:${port}${prefix}`.replace(/\/+$/, "");
}

function isConfiguredBaseUrl(value: string | undefined) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 && normalized !== "auto";
}

const apiScheme = process.env.EXPO_PUBLIC_API_SCHEME?.trim() || "http";
const apiPort = process.env.EXPO_PUBLIC_API_PORT?.trim() || "8000";
const apiPrefix = normalizePrefix(process.env.EXPO_PUBLIC_API_PREFIX?.trim() || "/api/v1");
const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const configuredHost = process.env.EXPO_PUBLIC_API_HOST?.trim() ?? "127.0.0.1";
const expoHost = resolveExpoDevHost();

function buildBaseUrlCandidates() {
  const candidates: string[] = [];

  if (isConfiguredBaseUrl(configuredBaseUrl)) {
    candidates.push(configuredBaseUrl!.replace(/\/+$/, ""));
  }

  if (expoHost) {
    candidates.push(
      buildBaseUrl({
        scheme: apiScheme,
        host: expoHost,
        port: apiPort,
        prefix: apiPrefix,
      })
    );
  }

  if (configuredHost) {
    candidates.push(
      buildBaseUrl({
        scheme: apiScheme,
        host: configuredHost,
        port: apiPort,
        prefix: apiPrefix,
      })
    );
  }

  if (Platform.OS === "android") {
    candidates.push(
      buildBaseUrl({
        scheme: apiScheme,
        host: "10.0.2.2",
        port: apiPort,
        prefix: apiPrefix,
      })
    );
  }

  candidates.push(
    buildBaseUrl({
      scheme: apiScheme,
      host: "127.0.0.1",
      port: apiPort,
      prefix: apiPrefix,
    })
  );
  candidates.push(
    buildBaseUrl({
      scheme: apiScheme,
      host: "localhost",
      port: apiPort,
      prefix: apiPrefix,
    })
  );

  return [...new Set(candidates)];
}

const apiBaseUrlCandidates = buildBaseUrlCandidates();
let resolvedApiBaseUrl: string | null = null;
let resolveApiBaseUrlPromise: Promise<string> | null = null;

async function isHealthEndpointReachable(baseUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function discoverApiBaseUrl() {
  for (const candidate of apiBaseUrlCandidates) {
    const reachable = await isHealthEndpointReachable(candidate);
    if (reachable) {
      return candidate;
    }
  }

  return apiBaseUrlCandidates[0];
}

async function ensureApiBaseUrl() {
  if (resolvedApiBaseUrl) {
    return resolvedApiBaseUrl;
  }

  if (!resolveApiBaseUrlPromise) {
    resolveApiBaseUrlPromise = discoverApiBaseUrl().then((baseUrl) => {
      resolvedApiBaseUrl = baseUrl;
      return baseUrl;
    });
  }

  return resolveApiBaseUrlPromise;
}

export const API_BASE_URL = apiBaseUrlCandidates[0];
const timeoutMs = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS ?? "12000");
const apiDebug = process.env.EXPO_PUBLIC_ENABLE_API_DEBUG === "true";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: Number.isFinite(timeoutMs) ? timeoutMs : 12000,
  headers: {
    Accept: "application/json",
  },
});

export function resolveApiAssetUrl(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) return null;

  try {
    const runtimeBaseUrl = String(api.defaults.baseURL ?? API_BASE_URL);
    const apiUrl = new URL(runtimeBaseUrl);

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

api.interceptors.request.use(async (config) => {
  const discoveredBaseUrl = await ensureApiBaseUrl();
  api.defaults.baseURL = discoveredBaseUrl;
  config.baseURL = discoveredBaseUrl;

  if (apiDebug) {
    const method = (config.method ?? "GET").toUpperCase();
    console.log(`[API] ${method} ${config.baseURL}${config.url}`);
  }

  return config;
});

if (apiDebug) {
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
} else {
  api.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error)
  );
}

export function getApiBaseUrl() {
  return String(api.defaults.baseURL ?? API_BASE_URL);
}

export async function primeApiBaseUrl() {
  const baseUrl = await ensureApiBaseUrl();
  api.defaults.baseURL = baseUrl;
  return baseUrl;
}

if (apiDebug) {
  void primeApiBaseUrl().then((baseUrl) => {
    console.log(`[API] Base URL resolvida automaticamente: ${baseUrl}`);
  }).catch(() => {
    // noop
  });
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
      return `Não foi possível conectar com a API Laravel (${getApiBaseUrl()}).`;
    }
  }

  return "Ocorreu um erro inesperado.";
}

export function withAuth(token: string) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

