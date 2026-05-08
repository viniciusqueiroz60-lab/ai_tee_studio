import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiJson, SESSION_KEY, setSessionId, getSessionId } from "@/lib/api";

interface GuestSession {
  sessionId: string;
  tokenBalance: number;
  expiresAt: string;
}

interface GuestSessionContextValue {
  session: GuestSession | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
}

const GuestSessionContext = createContext<GuestSessionContextValue>({
  session: null,
  loading: true,
  refreshSession: async () => {},
});

export function GuestSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<GuestSession | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshSession() {
    try {
      const existingId = getSessionId();
      const data = await apiJson<GuestSession>("/session/init", {
        method: "POST",
        body: JSON.stringify({ sessionId: existingId }),
      });
      setSessionId(data.sessionId);
      setSession(data);
    } catch {
      setSession(null);
    }
  }

  useEffect(() => {
    refreshSession().finally(() => setLoading(false));
  }, []);

  return (
    <GuestSessionContext.Provider value={{ session, loading, refreshSession }}>
      {children}
    </GuestSessionContext.Provider>
  );
}

export function useGuestSession() {
  return useContext(GuestSessionContext);
}
