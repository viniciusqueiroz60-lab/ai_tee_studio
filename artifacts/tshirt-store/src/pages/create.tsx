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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-10">
        <h1 className="font-display text-2xl md:text-3xl mb-1 text-foreground">Criar Design</h1>
        <p className="text-xs md:text-sm text-muted-foreground mb-5">
          Descreva sua ideia e nossa IA cria para você
        </p>

        {/* On desktop: two-col layout from the start (prompt+controls left, preview right) */}
        <div className="md:grid md:grid-cols-[1fr_1fr] md:gap-10 lg:grid-cols-[1.2fr_1fr]">
          {/* Left column: prompt + style + refinement */}
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            {!hasTokens && (
              <Alert className="py-2">
                <Lock className="w-4 h-4" />
                <AlertDescription className="text-sm">
                  Tokens esgotados.{" "}
                  <Link href="/auth" className="font-semibold underline">Cadastre-se</Link>{" "}
                  para ganhar mais.
                </AlertDescription>
              </Alert>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Descrição</label>
              <Textarea
                placeholder="Ex: um dragão japonês entre flores de cerejeira..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[110px] text-sm resize-none bg-card border-border focus:border-primary"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
                }}
              />
            </div>

            {/* Style picker */}
            {styles && styles.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Estilo</label>
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
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim() || !hasTokens}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Gerando com IA...</>
              ) : (
                <><Wand2 className="w-4 h-4" /> Gerar Design</>
              )}
            </button>

            {/* Refinement — desktop: shown in left col below generate */}
            {artwork && (
              <div className="hidden md:block pt-2 border-t border-border">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Refinar Design</label>
                {!user ? (
                  <button
                    onClick={() => setConversionModal("refine")}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors text-sm"
                  >
                    <Lock className="w-4 h-4" />
                    Entre para refinar com IA
                  </button>
                ) : (
                  <>
                    <Textarea
                      placeholder="Ex: adicione mais cores, mude o fundo..."
                      value={refinementPrompt}
                      onChange={(e) => setRefinementPrompt(e.target.value)}
                      className="min-h-[80px] resize-none text-sm"
                    />
                    <button
                      onClick={handleRefine}
                      disabled={refining || !refinementPrompt.trim()}
                      className="w-full mt-2 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border bg-card text-sm font-medium disabled:opacity-50 hover:bg-muted transition-colors"
                    >
                      {refining ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Refinar
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right column: preview (always visible on desktop) */}
          <div className="hidden md:block">
            <AnimatePresence mode="wait">
              {generating ? (
                <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="aspect-square rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col items-center justify-center gap-4"
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                      <Wand2 className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                    <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-primary text-sm">Gerando com Gemini AI...</p>
                    <p className="text-xs text-muted-foreground mt-1">Isso pode levar alguns segundos</p>
                  </div>
                </motion.div>
              ) : artwork ? (
                <motion.div key={artwork.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="relative aspect-square rounded-2xl overflow-hidden border border-border shadow-xl">
                    <img src={artwork.imageUrl} alt={artwork.prompt} className="w-full h-full object-cover" />
                    {artwork.styleLabel && (
                      <div className="absolute top-3 right-3">
                        <Badge variant="secondary" className="bg-black/50 text-white border-white/20 backdrop-blur-sm">
                          {artwork.styleLabel}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleShare} disabled={sharing || shared}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border bg-card text-sm font-medium disabled:opacity-50 hover:bg-muted transition-colors"
                    >
                      {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                      {shared ? "Compartilhado!" : "Compartilhar"}
                    </button>
                    <button onClick={handleOrder}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Pedir camiseta
                    </button>
                  </div>
                  <button onClick={() => { setArtwork(null); setPrompt(""); setShared(false); }}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" /> Criar novo design
                  </button>
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="aspect-square rounded-2xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-3 text-muted-foreground"
                >
                  <Wand2 className="w-12 h-12 opacity-30" />
                  <div className="text-center">
                    <p className="font-medium text-sm">Seu design aparecerá aqui</p>
                    <p className="text-xs mt-1 opacity-70">Descreva e clique em Gerar</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile: always-visible "Seu Design" + "Refinamento" grid */}
        <div className="md:hidden mt-5">
          <div className="grid gap-3" style={{ gridTemplateColumns: "1.5fr 1fr" }}>

            {/* Left: "Seu Design" card */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="px-3 pt-3 pb-2">
                <p className="text-[11px] font-semibold text-foreground">Seu Design</p>
              </div>

              {/* Artwork / placeholder */}
              <div className="px-3 pb-3">
                <AnimatePresence mode="wait">
                  {generating ? (
                    <motion.div
                      key="generating"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="aspect-square rounded-xl bg-primary/5 border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-2"
                    >
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Wand2 className="w-5 h-5 text-primary animate-pulse" />
                        </div>
                        <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
                      </div>
                      <p className="text-[10px] text-primary font-medium text-center px-1">Gerando...</p>
                    </motion.div>
                  ) : artwork ? (
                    <motion.div
                      key={artwork.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="aspect-square rounded-xl overflow-hidden">
                        <img
                          src={artwork.imageUrl}
                          alt={artwork.prompt}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="aspect-square rounded-xl border-2 border-dashed border-border/60 bg-muted/20 flex flex-col items-center justify-center gap-2 text-muted-foreground"
                    >
                      <Wand2 className="w-8 h-8 opacity-20" />
                      <p className="text-[9px] text-center px-2 opacity-50 leading-tight">Descreva e<br/>clique em Gerar</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom action bar — Regenerar | Galeria | Pedir */}
              <div className="border-t border-border flex">
                <button
                  onClick={() => { setArtwork(null); setPrompt(""); setShared(false); }}
                  disabled={!artwork && !generating}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 border-r border-border"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="text-[9px]">Regenerar</span>
                </button>
                <button
                  onClick={handleShare}
                  disabled={!artwork || sharing || shared}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 border-r border-border"
                >
                  {sharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span className="text-[9px]">{shared ? "Enviado!" : "Galeria"}</span>
                </button>
                <button
                  onClick={handleOrder}
                  disabled={!artwork || generating}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-primary disabled:opacity-30 hover:opacity-80 transition-opacity"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-medium">Pedir</span>
                </button>
              </div>
            </div>

            {/* Right: "Refinamento" panel */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-3 flex flex-col gap-3">
              <p className="text-[11px] font-semibold text-foreground">Refinamento</p>

              {/* Style pills */}
              {styles && styles.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">Estilo</p>
                  <div className="flex flex-wrap gap-1">
                    {styles.map((style) => (
                      <button
                        key={style.slug}
                        onClick={() => setSelectedStyle(selectedStyle === style.slug ? null : style.slug)}
                        className={`px-2 py-0.5 rounded-full text-[10px] border transition-all ${
                          selectedStyle === style.slug
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        {style.label.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Refine section */}
              <div className="flex-1">
                <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">Refinar</p>
                {!artwork ? (
                  <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 flex items-center justify-center py-4">
                    <p className="text-[9px] text-muted-foreground/50 text-center px-2 leading-tight">Gere um design<br/>para refinar</p>
                  </div>
                ) : !user ? (
                  <button
                    onClick={() => setConversionModal("refine")}
                    className="w-full flex flex-col items-center gap-1 py-3 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span className="text-[9px] text-center leading-tight">Entre para<br/>refinar</span>
                  </button>
                ) : (
                  <>
                    <Textarea
                      placeholder="Ex: mais cores..."
                      value={refinementPrompt}
                      onChange={(e) => setRefinementPrompt(e.target.value)}
                      className="min-h-[60px] text-[11px] resize-none p-2"
                    />
                    <button
                      onClick={handleRefine}
                      disabled={refining || !refinementPrompt.trim()}
                      className="w-full mt-1.5 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-border bg-background text-[10px] font-medium disabled:opacity-50 hover:bg-muted transition-colors"
                    >
                      {refining ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Refinar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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
