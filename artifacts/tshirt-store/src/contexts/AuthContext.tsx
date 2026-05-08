import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuth, getIdToken, type User } from "@/lib/firebase";
import { apiJson, SESSION_KEY } from "@/lib/api";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  idToken: string | null;
  tokenBalance: number | null;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  idToken: null,
  tokenBalance: null,
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);

  async function refreshUser() {
    const token = await getIdToken();
    setIdToken(token);
    if (token) {
      try {
        const me = await apiJson<{ tokenBalance: number }>("/me");
        setTokenBalance(me.tokenBalance);
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
        // Migrate guest session on login
        const sessionId = localStorage.getItem(SESSION_KEY);
        try {
          const me = await fetch(
            `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/me`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (me.ok) {
            const data = await me.json();
            setTokenBalance(data.tokenBalance);
          }
          if (sessionId) {
            await fetch(
              `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/me/migrate-session`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ sessionId }),
              }
            );
          }
        } catch {}
      } else {
        setIdToken(null);
        setTokenBalance(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, idToken, tokenBalance, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
