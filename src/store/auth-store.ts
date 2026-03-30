import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import type { ApiStudentProfile, ApiUser } from "../types/api";

const TOKEN_KEY = "edurush_access_token";
const USER_KEY = "edurush_user";
const PROFILE_KEY = "edurush_profile";

type AuthState = {
  token: string | null;
  user: ApiUser | null;
  profile: ApiStudentProfile | null;
  profilePhotoVersion: number;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (token: string, user: ApiUser, profile: ApiStudentProfile) => Promise<void>;
  updateUser: (user: ApiUser) => Promise<void>;
  updateProfile: (profile: ApiStudentProfile) => Promise<void>;
  clearSession: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  profile: null,
  profilePhotoVersion: 0,
  hydrated: false,
  hydrate: async () => {
    const [token, rawUser, rawProfile] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(USER_KEY),
      SecureStore.getItemAsync(PROFILE_KEY),
    ]);

    set({
      token: token ?? null,
      user: rawUser ? (JSON.parse(rawUser) as ApiUser) : null,
      profile: rawProfile ? (JSON.parse(rawProfile) as ApiStudentProfile) : null,
      profilePhotoVersion: Date.now(),
      hydrated: true,
    });
  },
  setSession: async (token, user, profile) => {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
      SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(profile)),
    ]);

    set({ token, user, profile, profilePhotoVersion: Date.now(), hydrated: true });
  },
  updateUser: async (user) => {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    set((state) => ({ ...state, user, profilePhotoVersion: Date.now() }));
  },
  updateProfile: async (profile) => {
    await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(profile));
    set((state) => ({ ...state, profile }));
  },
  clearSession: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
      SecureStore.deleteItemAsync(PROFILE_KEY),
    ]);

    set({ token: null, user: null, profile: null, profilePhotoVersion: 0, hydrated: true });
  },
}));
