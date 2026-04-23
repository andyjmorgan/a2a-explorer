import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  username?: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  tokenLifetimeSeconds: number | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;

  setHasHydrated: (value: boolean) => void;
  setTokens: (accessToken: string, refreshToken: string | null, expiresInSeconds: number) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
  isTokenExpired: () => boolean;
  shouldRefreshToken: () => boolean;
  refreshTokens: () => Promise<boolean>;
}

const EXPIRY_BUFFER_MS = 30_000;
const REFRESH_WINDOW_RATIO = 0.2;

export function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      tokenLifetimeSeconds: null,
      user: null,
      isAuthenticated: false,
      hasHydrated: false,

      setHasHydrated: (value) => set({ hasHydrated: value }),

      setTokens: (accessToken, refreshToken, expiresInSeconds) => {
        const expiresAt = Date.now() + expiresInSeconds * 1000;
        set({
          accessToken,
          refreshToken,
          expiresAt,
          tokenLifetimeSeconds: expiresInSeconds,
          isAuthenticated: true,
        });
      },

      setUser: (user) => set({ user }),

      logout: () => {
        set({
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
          tokenLifetimeSeconds: null,
          user: null,
          isAuthenticated: false,
        });
      },

      isTokenExpired: () => {
        const { expiresAt } = get();
        if (!expiresAt) return true;
        return Date.now() > expiresAt - EXPIRY_BUFFER_MS;
      },

      shouldRefreshToken: () => {
        const { expiresAt, tokenLifetimeSeconds } = get();
        if (!expiresAt || !tokenLifetimeSeconds) return false;
        const refreshAt = expiresAt - tokenLifetimeSeconds * 1000 * REFRESH_WINDOW_RATIO;
        return Date.now() > refreshAt;
      },

      refreshTokens: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return false;

        try {
          const response = await fetch("/api/v1/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          });

          if (!response.ok) {
            get().logout();
            return false;
          }

          const data = (await response.json()) as {
            accessToken: string;
            refreshToken: string | null;
            expiresIn: number;
          };

          get().setTokens(data.accessToken, data.refreshToken, data.expiresIn);
          return true;
        } catch {
          get().logout();
          return false;
        }
      },
    }),
    {
      name: "a2a-explorer-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        expiresAt: state.expiresAt,
        tokenLifetimeSeconds: state.tokenLifetimeSeconds,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
