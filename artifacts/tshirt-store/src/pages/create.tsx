import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useGuestSession } from "@/contexts/GuestSessionContext";
import { apiJson } from "@/lib/api";
import { useGetStyles } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
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

const PENDING_ACTION_KEY = "arttee_pending_action";

interface PendingAction {
  action: "refine" | "share" | "order";
  artworkId: number;
}

function savePendingAction(action: "refine" | "share" | "order", artworkId: number) {
  try {
    sessionStorage.setItem(PENDING_ACTION_KEY, JSON.stringify({ action, artworkId }));
  } catch (_) {}
}

function loadPendingAction(): PendingAction | null {
  try {
    const raw = sessionStorage.getItem(PENDING_ACTION_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_ACTION_KEY);
    return JSON.parse(raw) as PendingAction;
  } catch (_) { return null; }
}

// Shown when a guest tries a gated action: refine, share, order
function GuestConversionModal({
  open,
  onClose,
  action,
  artworkId,
}: {
  open: boolean;
  onClose: () => void;
  action: "refine" | "share" | "order";
  artworkId: number | null;
}) {
  const [, navigate] = useLocation();

  const messages: Record<string, { title: string; body: string }> = {
    refine: {
      title: "Refine seu design",
      body: "Crie uma conta grátis para refinar seu design com IA e ganhar mais tokens.",
    },
    share: {
      title: "Compartilhe na galeria",
      body: "Crie uma conta grátis para compartilhar seu design com a comunidade.",
    },
    order: {
      title: "Peça sua camiseta",
      body: "Crie uma conta grátis para finalizar seu pedido e receber a camiseta em casa.",
    },
  };

  const { title, body } = messages[action];

  function goToAuth(mode: "signup" | "login") {
    if (artworkId != null) savePendingAction(action, artworkId);
    onClose();
    navigate(mode === "signup" ? "/auth?mode=signup" : "/auth");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">{body}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <Button className="w-full" onClick={() => goToAuth("signup")}>
            Criar conta grátis
          </Button>
          <Button variant="outline" className="w-full" onClick={() => goToAuth("login")}>
            Já tenho conta — Entrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CreatePage() {
  const { user, tokenBalance, refreshUser } = useAuth();
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
  const [shareConfirmOpen, setShareConfirmOpen] = useState(false);

  const { data: styles } = useGetStyles();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const style = params.get("style");
    if (style) setSelectedStyle(style);
  }, []);

  // Resume a pending action after guest → user conversion
  useEffect(() => {
    if (!user) return; // wait until logged in
    const pending = loadPendingAction();
    if (!pending) return;

    // Fetch the artwork by ID (now owned by the user after migration)
    apiJson<GeneratedArtwork>(`/artworks/${pending.artworkId}`)
      .then((fetched) => {
        setArtwork(fetched);
        setShared(fetched.isShared);
        if (pending.action === "share") setShareConfirmOpen(true);
        else if (pending.action === "order") navigate(`/product/${fetched.id}`);
        // "refine" just restores the artwork; the refine textarea becomes visible
      })
      .catch(() => {
        // artwork no longer accessible — silently ignore
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-black">Criar Design</h1>
            <Badge variant={hasTokens ? "default" : "destructive"} className="gap-1.5 text-sm">
              <Zap className="w-3.5 h-3.5" />
              {balance} {balance === 1 ? "token" : "tokens"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Descreva sua ideia e nossa IA cria um design único para sua camiseta
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: controls */}
          <div className="space-y-6">
            {/* Style picker */}
            {styles && styles.length > 0 && (
              <div>
                <label className="text-sm font-semibold mb-3 block">Estilo Artístico</label>
                <div className="grid grid-cols-5 gap-2">
                  {styles.map((style) => (
                    <button
                      key={style.slug}
                      onClick={() => setSelectedStyle(selectedStyle === style.slug ? null : style.slug)}
                      className={`p-2.5 rounded-xl border-2 text-center transition-all ${
                        selectedStyle === style.slug
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border hover:border-primary/40 bg-card"
                      }`}
                      title={style.label}
                    >
                      <div className="text-2xl">{STYLE_EMOJIS[style.slug] ?? style.icon ?? "🎨"}</div>
                      <div className="text-xs mt-1 leading-tight text-muted-foreground line-clamp-1">
                        {style.label.split(" ")[0]}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Prompt */}
            <div>
              <label className="text-sm font-semibold mb-2 block">Descreva seu design</label>
              <Textarea
                placeholder="Ex: um dragão japonês entre flores de cerejeira, estilo aquarela..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px] text-base resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
                }}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Ctrl+Enter para gerar
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!hasTokens && (
              <Alert>
                <Lock className="w-4 h-4" />
                <AlertDescription>
                  Seus tokens gratuitos acabaram.{" "}
                  <Link href="/auth" className="font-semibold underline">
                    Cadastre-se
                  </Link>{" "}
                  para ganhar mais tokens.
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim() || !hasTokens}
              className="w-full h-12 text-base gap-2"
            >
              {generating ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Gerando com IA...</>
              ) : (
                <><Wand2 className="w-5 h-5" /> Gerar Design</>
              )}
            </Button>

            {/* Refinement */}
            {artwork && (
              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-3 text-muted-foreground font-semibold">
                      Refinar Design
                    </span>
                  </div>
                </div>

                {!user ? (
                  <div className="text-center p-4 rounded-xl border-2 border-dashed border-border">
                    <Lock className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Entre para refinar seu design com IA
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setConversionModal("refine")}>
                      Entrar / Cadastrar
                    </Button>
                  </div>
                ) : (
                  <>
                    <Textarea
                      placeholder="Ex: adicione mais cores, mude o fundo para preto..."
                      value={refinementPrompt}
                      onChange={(e) => setRefinementPrompt(e.target.value)}
                      className="min-h-[80px] resize-none"
                    />
                    <Button
                      onClick={handleRefine}
                      disabled={refining || !refinementPrompt.trim()}
                      variant="outline"
                      className="w-full gap-2"
                    >
                      {refining ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Refinando...</>
                      ) : (
                        <><RefreshCw className="w-4 h-4" /> Refinar</>
                      )}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right: preview */}
          <div>
            <AnimatePresence mode="wait">
              {generating ? (
                <motion.div
                  key="generating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="aspect-square rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col items-center justify-center gap-4"
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                      <Wand2 className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                    <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-primary">Gerando com Gemini AI...</p>
                    <p className="text-sm text-muted-foreground mt-1">Isso pode levar alguns segundos</p>
                  </div>
                </motion.div>
              ) : artwork ? (
                <motion.div
                  key={artwork.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="relative aspect-square rounded-2xl overflow-hidden border border-border shadow-xl">
                    <img
                      src={artwork.imageUrl}
                      alt={artwork.prompt}
                      className="w-full h-full object-cover"
                    />
                    {artwork.styleLabel && (
                      <div className="absolute top-3 right-3">
                        <Badge variant="secondary" className="bg-black/50 text-white border-white/20 backdrop-blur-sm">
                          {artwork.styleLabel}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={handleShare}
                      disabled={sharing || shared}
                    >
                      {sharing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                      {shared ? "Compartilhado!" : "Compartilhar"}
                    </Button>
                    <Button className="gap-2" onClick={handleOrder}>
                      <ShoppingCart className="w-4 h-4" />
                      Pedir camiseta
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    className="w-full gap-2 text-muted-foreground"
                    onClick={() => { setArtwork(null); setPrompt(""); setShared(false); }}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Criar novo design
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="aspect-square rounded-2xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-3 text-muted-foreground"
                >
                  <Wand2 className="w-12 h-12 opacity-30" />
                  <div className="text-center">
                    <p className="font-medium">Seu design aparecerá aqui</p>
                    <p className="text-sm mt-1 opacity-70">Descreva e clique em Gerar</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {conversionModal && (
        <GuestConversionModal
          open={true}
          action={conversionModal}
          artworkId={artwork?.id ?? null}
          onClose={() => setConversionModal(null)}
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
