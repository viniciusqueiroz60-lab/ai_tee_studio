import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useGuestSession } from "@/contexts/GuestSessionContext";
import { apiJson } from "@/lib/api";
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from "@/lib/firebase";
import { useGetStyles, useGetTshirtModels } from "@workspace/api-client-react";
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
  Share2, AlertCircle, Lock, Sparkles, Coins,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { TshirtMockup, type TshirtMockupHandle } from "@/components/TshirtMockup";

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
  const { data: models } = useGetTshirtModels();
  const mockupRef = useRef<TshirtMockupHandle>(null);
  const [selectedColor, setSelectedColor] = useState("white");
  const [selectedSize, setSelectedSize] = useState("M");

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
    <div className="min-h-screen bg-[#050508] atelier-grain overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 md:mb-12 text-center md:text-left"
        >
          <h1 className="font-serif text-4xl md:text-6xl mb-2 text-white italic tracking-tight">Atelier de Design</h1>
          <p className="text-sm md:text-base text-zinc-500 max-w-md font-medium">
            Onde a inteligência artificial encontra a alta costura digital.
          </p>
        </motion.div>

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

            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/0 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-[#0A0A0F] border border-white/5 rounded-2xl p-6 shadow-2xl">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-4">Especificações do Projeto</label>
                <div className="bg-[#fdfcf8] rounded-lg p-4 shadow-inner mb-4 transform -rotate-1 hover:rotate-0 transition-transform duration-500">
                  <Textarea
                    placeholder="Descreva a alma do seu design..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[140px] text-lg font-serif border-none bg-transparent text-zinc-800 placeholder:text-zinc-300 focus-visible:ring-0 resize-none italic"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
                    }}
                  />
                  <div className="flex justify-end mt-2">
                    <span className="text-[9px] text-zinc-400 font-mono uppercase">Draft v1.0</span>
                  </div>
                </div>

                {/* Style picker */}
                {styles && styles.length > 0 && (
                  <div className="mb-6">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-3">Direção Artística</label>
                    <div className="flex flex-wrap gap-2">
                      {styles.map((style) => (
                        <button
                          key={style.slug}
                          onClick={() => setSelectedStyle(selectedStyle === style.slug ? null : style.slug)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium border transition-all duration-300 ${
                            selectedStyle === style.slug
                              ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-105"
                              : "bg-white/5 text-zinc-400 border-white/10 hover:border-white/30 hover:text-white"
                          }`}
                        >
                          <span className="opacity-70">{STYLE_EMOJIS[style.slug] ?? style.icon ?? "🎨"}</span>
                          {style.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleGenerate}
                  disabled={generating || !prompt.trim() || !hasTokens}
                  className="w-full bg-white hover:bg-zinc-200 text-black rounded-xl py-6 text-base font-bold flex items-center justify-center gap-3 transition-all duration-500 disabled:opacity-30 group/btn overflow-hidden relative"
                >
                  {generating && <div className="absolute inset-0 light-leak opacity-50" />}
                  <span className="relative z-10 flex items-center gap-3">
                    {generating ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Materializando...</>
                    ) : (
                      <><Sparkles className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" /> Iniciar Criação</>
                    )}
                  </span>
                </Button>
              </div>
            </div>

            {/* Refinement — desktop: shown in left col below generate */}
            {artwork && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-6 mt-2 border-t border-white/5"
              >
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-4">Ajustes Finos</label>
                {!user ? (
                  <button
                    onClick={() => setConversionModal("refine")}
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:border-white/30 hover:text-white transition-all text-sm font-medium"
                  >
                    <Lock className="w-4 h-4" />
                    Autentique-se para refinar
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-zinc-900/50 rounded-xl p-1 border border-white/5 focus-within:border-white/20 transition-colors">
                      <Textarea
                        placeholder="Ex: Adicione texturas vintage, mude para tons pastéis..."
                        value={refinementPrompt}
                        onChange={(e) => setRefinementPrompt(e.target.value)}
                        className="min-h-[100px] border-none bg-transparent text-sm text-zinc-300 placeholder:text-zinc-600 focus-visible:ring-0 resize-none"
                      />
                    </div>
                    <button
                      onClick={handleRefine}
                      disabled={refining || !refinementPrompt.trim()}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold disabled:opacity-30 transition-all border border-white/5"
                    >
                      {refining ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Aplicar Refinamento
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          <div className="hidden md:block">
            <div className="sticky top-10">
              <AnimatePresence mode="wait">
                {generating ? (
                  <motion.div 
                    key="generating" 
                    initial={{ opacity: 0, scale: 0.9 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 1.1 }}
                    className="aspect-square rounded-[2rem] border border-white/5 bg-[#0A0A0F] flex flex-col items-center justify-center gap-6 overflow-hidden relative shadow-2xl"
                  >
                    <div className="absolute inset-0 light-leak opacity-20" />
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full border border-white/10 flex items-center justify-center backdrop-blur-md">
                        <Wand2 className="w-10 h-10 text-white animate-pulse" />
                      </div>
                      <motion.div 
                        animate={{ rotate: 360 }} 
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        className="absolute -inset-4 border border-dashed border-white/20 rounded-full" 
                      />
                    </div>
                    <div className="text-center z-10">
                      <p className="font-serif text-2xl text-white italic">Tecendo Design...</p>
                      <p className="text-xs text-zinc-500 mt-2 uppercase tracking-widest font-bold">Processamento em Alta Fidelidade</p>
                    </div>
                  </motion.div>
                ) : artwork ? (
                  <motion.div 
                    key={artwork.id} 
                    initial={{ opacity: 0, x: 20 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ type: "spring", damping: 20 }}
                    className="space-y-6"
                  >
                    <div className="relative aspect-square rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] group">
                      <motion.img 
                        layoutId={`art-${artwork.id}`}
                        src={artwork.imageUrl} 
                        alt={artwork.prompt} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-8">
                        <p className="text-white font-serif text-xl italic line-clamp-2">"{artwork.prompt}"</p>
                      </div>
                      {artwork.styleLabel && (
                        <div className="absolute top-6 right-6">
                          <div className="px-4 py-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full text-[10px] font-bold text-white uppercase tracking-widest">
                            {artwork.styleLabel}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Button 
                        onClick={handleShare} 
                        disabled={sharing || shared}
                        variant="outline"
                        className="rounded-xl py-6 border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold gap-2"
                      >
                        {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                        {shared ? "Arquivado na Galeria" : "Compartilhar Obra"}
                      </Button>
                      <Button 
                        onClick={handleOrder}
                        className="rounded-xl py-6 bg-white text-black hover:bg-zinc-200 font-bold gap-2 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Confecção Imediata
                      </Button>
                    </div>
                    
                    <button 
                      onClick={() => { setArtwork(null); setPrompt(""); setShared(false); }}
                      className="w-full flex items-center justify-center gap-2 py-4 text-xs font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest"
                    >
                      <RefreshCw className="w-4 h-4" /> Novo Briefing
                    </button>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="empty" 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="aspect-square rounded-[2rem] border border-white/5 bg-[#07070A] flex flex-col items-center justify-center gap-4 text-zinc-700 shadow-inner"
                  >
                    <div className="w-20 h-20 rounded-full border border-white/5 flex items-center justify-center">
                      <Wand2 className="w-8 h-8 opacity-20" />
                    </div>
                    <div className="text-center">
                      <p className="font-serif text-xl italic opacity-40">O Vazio Criativo</p>
                      <p className="text-[10px] mt-2 uppercase tracking-[0.3em] font-bold opacity-30">Aguardando Especificações</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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

        {/* ── Sua Camiseta ── always visible */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 mb-20 bg-[#0A0A0F] rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden"
        >
          <div className="grid md:grid-cols-[1.2fr_1fr]">
              {/* Left: T-shirt mockup workbench */}
              <div className="p-8 bg-zinc-950/50 flex items-center justify-center relative group">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)]" />
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="relative z-10 w-full max-w-md"
                >
                  <TshirtMockup
                    ref={mockupRef}
                    artworkUrl={artwork?.imageUrl ?? null}
                    color={selectedColor}
                    mockupUrl={models?.[0]?.mockupUrl ?? null}
                    altText={artwork?.prompt}
                  />
                </motion.div>
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/5">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-widest">Workbench Active</span>
                </div>
              </div>

              {/* Right: config panel */}
              <div className="p-8 md:p-12 flex flex-col gap-8 border-t md:border-t-0 md:border-l border-white/5">
                <div>
                  <h2 className="font-serif text-3xl text-white italic mb-1">A Peça Final</h2>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Customização de Ateliê</p>
                </div>

                {/* Color picker */}
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Paleta de Tecidos</p>
                  <div className="flex gap-3 flex-wrap">
                    {(models?.[0]?.availableColors ?? ["white", "black"]).map((color) => {
                      const label: Record<string, string> = {
                        white: "Off-White", black: "Obsidian", gray: "Stone",
                        navy: "Midnight", sand: "Sand", sage: "Sage",
                        charcoal: "Charcoal", red: "Crimson",
                      };
                      return (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`group relative flex flex-col items-center gap-2 transition-all duration-300 ${
                            selectedColor === color ? "scale-110" : "opacity-40 hover:opacity-100"
                          }`}
                        >
                          <div 
                            className={`w-8 h-8 rounded-full border transition-all ${
                              selectedColor === color ? "border-white ring-4 ring-white/10" : "border-white/10"
                            }`} 
                            style={{ backgroundColor: color === 'white' ? '#f8f8f8' : color === 'black' ? '#111' : color }} 
                          />
                          <span className="text-[9px] font-bold uppercase tracking-tighter text-zinc-400 group-hover:text-white transition-colors">{label[color] ?? color}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Size picker */}
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Dimensões</p>
                  <div className="flex gap-2 flex-wrap">
                    {["PP", "P", "M", "G", "GG", "XGG"].map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`min-w-[48px] h-12 px-2 rounded-xl text-xs font-bold border transition-all duration-300 ${
                          selectedSize === size
                            ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                            : "border-white/10 bg-white/5 text-zinc-500 hover:border-white/30 hover:text-white"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price + CTA */}
                <div className="mt-auto pt-8 border-t border-white/5">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Investimento</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-serif text-white italic">150</span>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase">Tokens de Ateliê</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Entrega</p>
                      <p className="text-xs text-white font-bold italic">7-10 Dias Úteis</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleOrder}
                    disabled={!artwork || generating}
                    className="w-full bg-white hover:bg-zinc-200 text-black rounded-xl py-8 text-base font-black flex items-center justify-center gap-3 shadow-[0_20px_40px_-10px_rgba(255,255,255,0.1)] transition-all active:scale-[0.98] disabled:opacity-30"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Adicionar ao Carrinho de Luxo
                  </Button>
                </div>
              </div>
            </div>
        </motion.div>
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
