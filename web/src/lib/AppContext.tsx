import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ApiError, api, type ApiUser } from "./api";

type AppState = {
  user: ApiUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  refreshUser: () => Promise<ApiUser | null>;
  acceptUser: (user: ApiUser) => void;
  signOut: () => Promise<void>;
};

const AppContext = createContext<AppState | undefined>(undefined);
const publicAuthPaths = new Set([
  "/login",
  "/sign-in",
  "/register",
  "/sign-up",
  "/forgot-password",
  "/reset",
  "/user/reset",
  "/auth/user/reset",
  "/otp",
  "/setup",
  "/oauth/callback",
  "/payment/callback",
]);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshUser() {
    try {
      const currentUser = await api.self();
      setUser(currentUser);
      void api.csrfToken().catch((error) => {
        console.error("Unable to initialize CSRF protection", error);
      });
      return currentUser;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        localStorage.removeItem("new-api-user-id");
      } else {
        console.error("Unable to load session", error);
      }
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut() {
    try {
      await api.logout();
    } finally {
      setUser(null);
      localStorage.removeItem("new-api-user-id");
      sessionStorage.removeItem("helstare-csrf-token");
    }
  }

  function acceptUser(currentUser: ApiUser) {
    setUser(currentUser);
    setIsLoading(false);
    void api.csrfToken().catch((error) => {
      console.error("Unable to initialize CSRF protection", error);
    });
  }

  useEffect(() => {
    if (publicAuthPaths.has(window.location.pathname)) {
      setIsLoading(false);
      return;
    }
    void refreshUser();
  }, []);

  const value = useMemo<AppState>(
    () => ({
      user,
      isAdmin: (user?.role ?? 0) >= 10,
      isLoading,
      refreshUser,
      acceptUser,
      signOut,
    }),
    [user, isLoading],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider.");
  return context;
}
