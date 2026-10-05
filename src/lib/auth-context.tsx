"use client";

import {
  createContext,
  use,
  useCallback,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { getAccessToken, getStoredUser, login as apiLogin, logout as apiLogout } from "./api";
import type { User } from "./types";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthSnapshot {
  user: User | null;
  hydrated: boolean;
}

const EMPTY_SNAPSHOT: AuthSnapshot = { user: null, hydrated: false };

let currentSnapshot: AuthSnapshot = EMPTY_SNAPSHOT;
let snapshotUserId: number | null | undefined = undefined;
const listeners = new Set<() => void>();

function getSnapshot(): AuthSnapshot {
  if (currentSnapshot === EMPTY_SNAPSHOT && typeof window !== "undefined") {
    const user = getStoredUser();
    snapshotUserId = user?.id ?? null;
    currentSnapshot = { user, hydrated: true };
  }
  return currentSnapshot;
}

function getServerSnapshot(): AuthSnapshot {
  return EMPTY_SNAPSHOT;
}

function refresh(): void {
  if (typeof window === "undefined") return;
  const user = getStoredUser();
  const id = user?.id ?? null;
  if (snapshotUserId !== id) {
    snapshotUserId = id;
    currentSnapshot = { user, hydrated: true };
    for (const listener of listeners) listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", refresh);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", refresh);
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, hydrated } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const login = useCallback(async (email: string, password: string) => {
    await apiLogin(email, password);
    refresh();
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    refresh();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user && getAccessToken()),
      hydrated,
      login,
      logout,
    }),
    [user, hydrated, login, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}