"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  platformApi,
  type PlatformMembership,
} from "@/lib/platform-api";

interface LoginInput {
  email: string;
  password: string;
  otp?: string;
  recovery_code?: string;
}

interface AuthContextValue {
  ready: boolean;
  membership: PlatformMembership | null;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshMembership: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [membership, setMembership] = useState<PlatformMembership | null>(null);

  async function refreshMembership() {
    const current = await platformApi.me();
    setMembership(current);
  }

  useEffect(() => {
    let active = true;
    async function restoreSession() {
      if (platformApi.restore()) {
        try {
          const current = await platformApi.me();
          if (active) setMembership(current);
        } catch {
          platformApi.clearSession();
        }
      }
      if (active) setReady(true);
    }
    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      membership,
      async login(input) {
        await platformApi.login(input.email, input.password, {
          otp: input.otp,
          recovery_code: input.recovery_code,
        });
        await refreshMembership();
      },
      async logout() {
        await platformApi.logout();
        setMembership(null);
      },
      refreshMembership,
    }),
    [ready, membership],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
