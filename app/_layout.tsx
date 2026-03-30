import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { CenteredState } from "../src/components/CenteredState";
import { useAuthStore } from "../src/store/auth-store";
import { useThemeStore } from "../src/store/theme-store";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const token = useAuthStore((state) => state.token);
  const authHydrated = useAuthStore((state) => state.hydrated);
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const isDark = useThemeStore((state) => state.isDark);
  const themeHydrated = useThemeStore((state) => state.hydrated);
  const hydrateTheme = useThemeStore((state) => state.hydrate);
  const hydrated = authHydrated && themeHydrated;

  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 15_000,
          },
        },
      }),
    []
  );

  useEffect(() => {
    void Promise.all([hydrateAuth(), hydrateTheme()]);
  }, [hydrateAuth, hydrateTheme]);

  useEffect(() => {
    if (!hydrated) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!token && !inAuthGroup) {
      router.replace("/(auth)/login");
    }

    if (token && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [token, hydrated, segments, router]);

  if (!hydrated) {
    return <CenteredState loading message="Preparando EduRush..." />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="review" />
        <Stack.Screen name="trail/[slug]" />
        <Stack.Screen name="lesson/[slug]" />
      </Stack>
    </QueryClientProvider>
  );
}
