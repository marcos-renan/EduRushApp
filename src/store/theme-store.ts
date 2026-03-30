import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

const THEME_KEY = "edurush_dark_mode";

type ThemeState = {
  isDark: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setDarkMode: (value: boolean) => Promise<void>;
  toggleDarkMode: () => Promise<void>;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: false,
  hydrated: false,
  hydrate: async () => {
    const stored = await SecureStore.getItemAsync(THEME_KEY);
    set({
      isDark: stored === "1",
      hydrated: true,
    });
  },
  setDarkMode: async (value) => {
    await SecureStore.setItemAsync(THEME_KEY, value ? "1" : "0");
    set({ isDark: value, hydrated: true });
  },
  toggleDarkMode: async () => {
    const next = !get().isDark;
    await SecureStore.setItemAsync(THEME_KEY, next ? "1" : "0");
    set({ isDark: next, hydrated: true });
  },
}));
