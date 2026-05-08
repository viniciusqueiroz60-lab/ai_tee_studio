import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useGuestSession } from "@/contexts/GuestSessionContext";
import { apiJson } from "@/lib/api";
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from "@/lib/firebase";
import { useGetStyles } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Zap, Loader2, Wand2, RefreshCw, ShoppingCart,
  Share2, AlertCircle, Lock, Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";

const STYLE_EMOJIS: Record<string, string> = {
  "cyberpunk-neon": "⚡",
  "minimalismo-japones": "🌸",
  "dark-rock-stipple": "🤘",
  "vaporwave-retro": "🌴",
  "vector-pop-art": "🎨",
};

interface GeneratedArtwork {
  id: number;
  imageUrl: string;
  prompt: string;
  styleLabel?: string | null;
  styleSlug?: string | null;
  isShared: boolean;
}

// Shown when a guest tries a gated action: refine, share, order.
// Provides inline Firebase auth so the user never leaves the page.
function GuestConversionModal({
  open,
  onClose,
  action,
  onAuthSuccess,
}: {
  open: boolean;
  onClose: () => void;
  action: "refine" | "share" | "order";
  onAuthSuccess: () => void;
}) {
  const [mode, setMode] = useState<"options" | "signin" | "signup">("options");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const ACTION_LABELS: Record<string, string> = {
    refine: "refinar seu design",
    share: "compartilhar na galeria",
    order: "pedir sua camiseta",
  };

  async function handleGoogle() {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signInWithGoogle();
      onAuthSuccess();
    } catch (e: unknown) {
      setAuthError(e instanceof Error ? e.message : "Erro ao entrar com Google");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleEmail() {
    if (!email.trim() || !password.trim()) { setAuthError("Preencha email e senha."); return; }
    setAuthError(null);
    setAuthLoading(true);
    try {
      if (mode === "signup") {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      onAuthSuccess();
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      setAuthError(
        code === "auth/invalid-credential" ? "Email ou senha inválidos"
        : code === "auth/email-already-in-use" ? "Este email já está em uso"
        : code === "auth/weak-password" ? "Senha muito fraca (mínimo 6 caracteres)"
        : e instanceof Error ? e.message : "Erro de autenticação"
      );
    } finally {
      setAuthLoading(false);
    }
  }

  function handleClose() {
    setMode("options");
    setEmail("");
    setPassword("");
    setAuthError(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Entre para continuar</DialogTitle>
          <DialogDescription className="text-center">
            Crie uma conta grátis ou entre para {ACTION_LABELS[action]}.
          </DialogDescription>
        </DialogHeader>

        {mode === "options" ? (
          <div className="space-y-3 pt-2">
            <Button className="w-full gap-2" onClick={handleGoogle} disabled={authLoading}>
              {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              )}
              Entrar com Google
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs text-muted-foreground"><span className="bg-background px-2">ou</span></div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setMode("signup")}>
              Criar conta com email
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground text-sm" onClick={() => setMode("signin")}>
              Já tenho conta — Entrar
            </Button>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {authError && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-sm">{authError}</AlertDescription>
              </Alert>
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEmail()}
              disabled={authLoading}
            />
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEmail()}
              disabled={authLoading}
            />
            <Button className="w-full gap-2" onClick={handleEmail} disabled={authLoading}>
              {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {mode === "signup" ? "Criar conta" : "Entrar"}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-sm text-muted-foreground"
              onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setAuthError(null); }}
            >
              {mode === "signup" ? "Já tenho conta" : "Criar conta grátis"}
            </Button>
            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={() => { setMode("options"); setAuthError(null); }}>
              ← Voltar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function CreatePage() {
  const { user, tokenBalance, migrationSettled, refreshUser } = useAuth();
  const { session, refreshSession } = useGuestSession();
  const [, navigate] = useLocation();

  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [artwork, setArtwork] = useState<GeneratedArtwork | null>(null);
  const [refinementPrompt, setRefinementPrompt] = useState("");
  const [shared, setShared] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [conversionModal, setConversionModal] = useState<"refine" | "share" | "order" | null>(null);
  const [pendingConversionAction, setPendingConversionAction] = useState<"refine" | "share" | "order" | null>(null);
  const [shareConfirmOpen, setShareConfirmOpen] = useState(false);

  const { data: styles } = useGetStyles();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const style = params.get("style");
    if (style) setSelectedStyle(style);
    const p = params.get("prompt");
    if (p) setPrompt(p);
  }, []);

  // Resume the pending action only after the full auth + migration flow has settled.
  // Waiting for migrationSettled prevents share/order from firing before artwork ownership
  // has been transferred from the guest session to the authenticated user.
  useEffect(() => {
    if (!user || !migrationSettled || !pendingConversionAction || !artwork) return;
    const action = pendingConversionAction;
    setPendingConversionAction(null);
    if (action === "share") setShareConfirmOpen(true);
    else if (action === "order") navigate(`/product/${artwork.id}`);
    // "refine": user is now logged in → the refine textarea becomes visible automatically
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, migrationSettled, pendingConversionAction]);

  const balance = user ? (tokenBalance ?? 0) : (session?.tokenBalance ?? 0);
  const hasTokens = balance > 0;

  async function handleGenerate() {
    if (!prompt.trim()) { setError("Descreva o design que você quer criar."); return; }
    if (!hasTokens) { setError("Você não tem tokens suficientes. Cadastre-se para ganhar mais."); return; }

    setGenerating(true);
    setError(null);
    try {
      const body: Record<string, string> = { prompt: prompt.trim() };
      if (selectedStyle) body.styleSlug = selectedStyle;
      if (!user && session) body.sessionId = session.sessionId;

      const result = await apiJson<GeneratedArtwork>("/generate", {
        method: "POST",
        body: JSON.stringify(body),
      });

      setArtwork(result);
      setShared(result.isShared);
      if (user) await refreshUser();
      else await refreshSession();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao gerar design");
    } finally {
      setGenerating(false);
    }
  }

  async function handleRefine() {
    if (!artwork || !refinementPrompt.trim()) return;
    if (!user) { setConversionModal("refine"); return; }

    setRefining(true);
    setError(null);
    try {
      const result = await apiJson<GeneratedArtwork>("/refine", {
        method: "POST",
        body: JSON.stringify({ artworkId: artwork.id, refinementPrompt: refinementPrompt.trim() }),
      });
      setArtwork(result);
      setRefinementPrompt("");
      await refreshUser();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao refinar design");
    } finally {
      setRefining(false);
    }
  }

  function handleShare() {
    if (!artwork) return;
    if (!user) { setConversionModal("share"); return; }
    setShareConfirmOpen(true);
  }

  async function confirmShare() {
    if (!artwork) return;
    setShareConfirmOpen(false);
    setSharing(true);
    try {
      await apiJson(`/artworks/${artwork.id}/share`, { method: "POST" });
      setShared(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao compartilhar");
    } finally {
      setSharing(false);
    }
  }

  function handleOrder() {
    if (!artwork) return;
    if (!user) { setConversionModal("order"); return; }
    navigate(`/product/${artwork.id}`);
  }

  return (
    <div className="min-h-screen">
      {/* Prompt section */}
      <section className="px-4 pt-4 pb-0">
        <h1 className="font-display text-2xl mb-1 text-foreground">Criar Design</h1>
        <p className="text-xs text-muted-foreground mb-3">
          Descreva sua ideia e nossa IA cria para você
        </p>

        {error && (
          <Alert variant="destructive" className="mb-3 py-2">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {!hasTokens && (
          <Alert className="mb-3 py-2">
            <Lock className="w-4 h-4" />
            <AlertDescription className="text-sm">
              Tokens esgotados.{" "}
              <Link href="/auth" className="font-semibold underline">Cadastre-se</Link>{" "}
              para ganhar mais.
            </AlertDescription>
          </Alert>
        )}

        <Textarea
          placeholder="Ex: um dragão japonês entre flores de cerejeira..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[110px] text-sm resize-none bg-card border-border focus:border-primary"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
          }}
        />

        <button
          onClick={handleGenerate}
          disabled={generating || !prompt.trim() || !hasTokens}
          className="w-full mt-3 bg-primary text-primary-foreground rounded-lg py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:opacity-90 transition-opacity"
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Gerando com IA...</>
          ) : (
            <><Wand2 className="w-4 h-4" /> Gerar Design</>
          )}
        </button>
      </section>

      {/* Style picker (when no artwork yet) */}
      {!artwork && !generating && styles && styles.length > 0 && (
        <section className="px-4 mt-5">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Estilo</p>
          <div className="flex flex-wrap gap-2">
            {styles.map((style) => (
              <button
                key={style.slug}
                onClick={() => setSelectedStyle(selectedStyle === style.slug ? null : style.slug)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all ${
                  selectedStyle === style.slug
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border"
                }`}
              >
                <span>{STYLE_EMOJIS[style.slug] ?? style.icon ?? "🎨"}</span>
                {style.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Creation grid — shown when generating or artwork exists */}
      {(artwork || generating) && (
        <section className="px-4 mt-5">
          <div className="grid gap-4" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
            {/* Left: preview card */}
            <div className="bg-card rounded-xl p-3 border border-border shadow-sm">
              <AnimatePresence mode="wait">
                {generating ? (
                  <motion.div
                    key="generating"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="aspect-square rounded-lg bg-primary/5 border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-3"
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <Wand2 className="w-6 h-6 text-primary animate-pulse" />
                      </div>
                      <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
                    </div>
                    <p className="text-xs text-primary font-medium text-center px-2">Gerando...</p>
                  </motion.div>
                ) : artwork ? (
                  <motion.div
                    key={artwork.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="aspect-square rounded-lg overflow-hidden">
                      <img
                        src={artwork.imageUrl}
                        alt={artwork.prompt}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* Icon action buttons */}
              {artwork && !generating && (
                <div className="flex gap-2 mt-3 justify-center">
                  <button
                    onClick={() => { setArtwork(null); setPrompt(""); setShared(false); }}
                    className="w-9 h-9 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    title="Novo design"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={sharing || shared}
                    className="w-9 h-9 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    title={shared ? "Compartilhado!" : "Compartilhar na galeria"}
                  >
                    {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={handleOrder}
                    className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
                    title="Pedir camiseta"
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Right: refinement panel */}
            <div className="flex flex-col gap-4">
              {/* Style pills */}
              {styles && styles.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-2">Estilo</p>
                  <div className="flex flex-wrap gap-1.5">
                    {styles.map((style) => (
                      <button
                        key={style.slug}
                        onClick={() => setSelectedStyle(selectedStyle === style.slug ? null : style.slug)}
                        className={`px-2 py-1 rounded-full text-[11px] border transition-all ${
                          selectedStyle === style.slug
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-muted-foreground border-border"
                        }`}
                      >
                        {style.label.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Refinement */}
              {artwork && (
                <div>
                  <p className="text-xs font-medium mb-2">Refinar</p>
                  {!user ? (
                    <button
                      onClick={() => setConversionModal("refine")}
                      className="w-full flex flex-col items-center gap-1.5 py-4 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      <Lock className="w-4 h-4" />
                      <span className="text-[11px] text-center">Entre para refinar</span>
                    </button>
                  ) : (
                    <>
                      <Textarea
                        placeholder="Adicione mais cores..."
                        value={refinementPrompt}
                        onChange={(e) => setRefinementPrompt(e.target.value)}
                        className="min-h-[72px] text-xs resize-none"
                      />
                      <button
                        onClick={handleRefine}
                        disabled={refining || !refinementPrompt.trim()}
                        className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border bg-card text-xs font-medium disabled:opacity-50 hover:bg-muted transition-colors"
                      >
                        {refining ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        Refinar
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Order CTA */}
              {artwork && !generating && (
                <button
                  onClick={handleOrder}
                  className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 active:opacity-90 transition-opacity"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Pedir camiseta
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {conversionModal && (
        <GuestConversionModal
          open={true}
          action={conversionModal}
          onClose={() => setConversionModal(null)}
          onAuthSuccess={() => {
            const action = conversionModal;
            setConversionModal(null);
            setPendingConversionAction(action);
          }}
        />
      )}

      <Dialog open={shareConfirmOpen} onOpenChange={(o) => { if (!o) setShareConfirmOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Compartilhar na galeria?</DialogTitle>
            <DialogDescription>
              Seu design será enviado para moderação e, se aprovado, aparecerá na galeria pública da comunidade.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShareConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button className="flex-1 gap-2" onClick={confirmShare}>
              <Share2 className="w-4 h-4" />
              Compartilhar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
