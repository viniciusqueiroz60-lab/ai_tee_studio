import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuth, getIdToken, type User } from "@/lib/firebase";
import { SESSION_KEY } from "@/lib/api";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  idToken: string | null;
  tokenBalance: number | null;
  role: "user" | "admin" | null;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  idToken: null,
  tokenBalance: null,
  role: null,
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [role, setRole] = useState<"user" | "admin" | null>(null);

  async function refreshUser() {
    const token = await getIdToken();
    setIdToken(token);
    if (token) {
      try {
        const res = await fetch(`${BASE}/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setTokenBalance(data.tokenBalance);
          setRole(data.role === "admin" ? "admin" : "user");
        }
      } catch {
        setTokenBalance(null);
      }
    }
  }

  useEffect(() => {
    const unsub = onAuth(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        setIdToken(token);
        const sessionId = localStorage.getItem(SESSION_KEY);
        try {
          const res = await fetch(`${BASE}/api/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setTokenBalance(data.tokenBalance);
            setRole(data.role === "admin" ? "admin" : "user");
          }
          if (sessionId) {
            const migRes = await fetch(`${BASE}/api/me/migrate-session`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ sessionId }),
            });
            if (migRes.ok) {
              const migData = await migRes.json();
              if (migData.migrated && migData.tokensAdded > 0) {
                // Re-fetch /me to reflect migrated token balance immediately
                const meRes = await fetch(`${BASE}/api/me`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (meRes.ok) {
                  const meData = await meRes.json();
                  setTokenBalance(meData.tokenBalance);
                  setRole(meData.role === "admin" ? "admin" : "user");
                }
              }
            }
          }
        } catch { /* token refresh or /me fetch failed — user stays logged out */ }
      } else {
        setIdToken(null);
        setTokenBalance(null);
        setRole(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, idToken, tokenBalance, role, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
