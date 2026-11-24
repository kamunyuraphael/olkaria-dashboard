import { useState, useCallback, useContext, createContext, createElement, useEffect } from "react";
import type { ReactNode } from "react";
import type { User, Credentials, AccessRequest } from "@/models/auth.types";
import { AUTH_TOKEN_STORAGE_KEY, apiUrl } from "@/lib/apiClient";
import { saveDefaultLocation } from "@/lib/jobsClient";
import { changePasswordRequest, deleteAccountRequest } from "@/lib/adminClient";

/**
 * Owns authentication state. Real now: login/me/logout/requestAccess all
 * call server/'s /api/auth/* routes (API_CONTRACT.md). The JWT + user are
 * persisted to localStorage (not sessionStorage - unlike an in-flight
 * analysis job, a login should survive closing the tab) so a refresh
 * restores the session via GET /me rather than bouncing to the login
 * screen every time.
 */

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (creds: Credentials) => Promise<void>;
  requestAccess: (req: AccessRequest) => Promise<void>;
  logout: () => void;
  /** Saves (or with null, clears) the user's default location. Throws on failure. */
  changePassword: (current: string, next: string) => Promise<void>;
  /** Permanently deletes the account and all its runs. Throws on failure. */
  deleteAccount: (password: string) => Promise<void>;
  updateLocation: (loc: { latitude: number; longitude: number; label?: string } | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return typeof body?.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (creds: Credentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
      });
      if (!res.ok) {
        setError(await parseErrorMessage(res, "Invalid email or password."));
        return;
      }
      const { token, user: loggedInUser } = await res.json();
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
      setUser(loggedInUser);
    } catch {
      setError("Could not reach the server. It may be waking up after a quiet period. Wait about 30 seconds and try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestAccess = useCallback(async (req: AccessRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/auth/request-access"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) {
        setError(await parseErrorMessage(res, "Could not submit the request."));
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    setUser(null);
    if (token) {
      // Stateless JWT - nothing to wait for; fire and forget.
      void fetch(apiUrl("/api/auth/logout"), { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    }
  }, []);

  const updateLocation = useCallback(
    async (loc: { latitude: number; longitude: number; label?: string } | null) => {
      const updated = (await saveDefaultLocation(loc ?? { clear: true })) as User;
      setUser(updated);
    },
    []
  );

  const changePassword = useCallback(async (current: string, next: string) => {
    setUser((await changePasswordRequest(current, next)) as User);
  }, []);

  const deleteAccount = useCallback(async (password: string) => {
    await deleteAccountRequest(password);
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    setUser(null);
  }, []);

  // Restore a session from a stored token on load.
  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (!token) return;
    setIsLoading(true);
    fetch(apiUrl("/api/auth/me"), { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!res.ok) {
          localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
          return;
        }
        const { user: restoredUser } = await res.json();
        setUser(restoredUser);
      })
      .catch(() => {
        // Network hiccup restoring the session - leave the stored token in
        // place and let the user retry rather than logging them out.
      })
      .finally(() => setIsLoading(false));
  }, []);

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    error,
    login,
    requestAccess,
    logout,
    updateLocation,
    changePassword,
    deleteAccount,
  };

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
