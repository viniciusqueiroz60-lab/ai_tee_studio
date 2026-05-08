import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useGetGallery, useGetStyles } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiJson } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Heart, Eye, ShoppingCart, TrendingUp, Clock, Loader2, X } from "lucide-react";
import { motion } from "framer-motion";

const STYLE_EMOJIS: Record<string, string> = {
  "cyberpunk-neon": "⚡",
  "minimalismo-japones": "🌸",
  "dark-rock-stipple": "🤘",
  "vaporwave-retro": "🌴",
  "vector-pop-art": "🎨",
};

interface GalleryArtwork {
  id: number;
  userId: number | null;
  prompt: string;
  styleSlug: string | null;
  styleLabel: string | null;
  imageUrl: string;
  likes: number;
  views: number;
  authorName: string | null;
  createdAt: string;
}

interface ArtworkDetailModalProps {
  artwork: GalleryArtwork | null;
  onClose: () => void;
}

function ArtworkDetailModal({ artwork, onClose }: ArtworkDetailModalProps) {
  const { user, idToken } = useAuth();
  const [, navigate] = useLocation();
  const [likes, setLikes] = useState(artwork?.likes ?? 0);
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);

  // Hydrate like state from server when the modal opens for an authenticated user
  useEffect(() => {
    if (!artwork || !user || !idToken) return;
    const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${BASE}/api/artworks/${artwork.id}`, {
      headers: { Authorization: `Bearer ${idToken}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.userLiked != null) setLiked(data.userLiked); })
      .catch(() => {});
  }, [artwork?.id, user?.uid]);

  if (!artwork) return null;

  async function handleLike() {
    if (!artwork) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    setLiking(true);
    try {
      if (liked) {
        const res = await apiJson<{ likes: number; liked: boolean }>(
          `/artworks/${artwork.id}/like`,
          { method: "DELETE" }
        );
        setLikes(res.likes);
        setLiked(false);
      } else {
        const res = await apiJson<{ likes: number; liked: boolean }>(
          `/artworks/${artwork.id}/like`,
          { method: "POST" }
        );
        setLikes(res.likes);
        setLiked(true);
      }
    } catch {
      // ignore
    } finally {
      setLiking(false);
    }
  }

  function handleOrder() {
    onClose();
    if (!user) {
      navigate("/auth");
    } else {
      navigate(`/product/${artwork!.id}`);
    }
  }

  return (
    <Dialog open={!!artwork} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div className="grid sm:grid-cols-2">
          {/* Image */}
          <div className="relative bg-muted aspect-square sm:aspect-auto">
            <img
              src={artwork.imageUrl}
              alt={artwork.prompt}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Info */}
          <div className="p-6 flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold leading-snug">
                {artwork.prompt}
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-wrap items-center gap-2">
              {artwork.styleLabel && (
                <Badge variant="secondary">{artwork.styleLabel}</Badge>
              )}
              {artwork.authorName && (
                <span className="text-xs text-muted-foreground">
                  por {artwork.authorName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Heart className={`w-4 h-4 ${liked ? "fill-red-500 text-red-500" : ""}`} />
                {likes}
              </span>
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                {artwork.views}
              </span>
            </div>

            <div className="mt-auto space-y-3">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleLike}
                disabled={liking}
              >
                {liking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Heart className={`w-4 h-4 ${liked ? "fill-red-500 text-red-500" : ""}`} />
                )}
                {liked ? "Curtido!" : "Curtir design"}
              </Button>

              <Button className="w-full gap-2" onClick={handleOrder}>
                <ShoppingCart className="w-4 h-4" />
                Quero este design
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function GalleryPage() {
  const [selectedStyle, setSelectedStyle] = useState<string>("all");
  const [sort, setSort] = useState<"recent" | "popular">("recent");
  const [activeArtwork, setActiveArtwork] = useState<GalleryArtwork | null>(null);

  const { data: styles } = useGetStyles();
  const { data: gallery, isLoading } = useGetGallery({
    style: selectedStyle !== "all" ? selectedStyle : undefined,
    sort,
    limit: 24,
  });

  const artworks = (gallery?.artworks ?? []) as GalleryArtwork[];

  return (
    <div className="min-h-screen">
      <div className="px-4 pt-5 pb-4">
        <h1 className="font-display text-2xl mb-1 text-foreground">Galeria da Comunidade</h1>
        <p className="text-sm text-muted-foreground">Designs criados com IA pela nossa comunidade</p>
      </div>

      {/* Sort pills + style filter */}
      <div className="px-4 mb-4 space-y-3">
        <div className="flex gap-2">
          {(["recent", "popular"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                sort === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border"
              }`}
            >
              {s === "recent" ? <><Clock className="w-3 h-3" /> Recentes</> : <><TrendingUp className="w-3 h-3" /> Populares</>}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedStyle("all")}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              selectedStyle === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border"
            }`}
          >
            Todos
          </button>
          {styles?.map((style) => (
            <button
              key={style.slug}
              onClick={() => setSelectedStyle(style.slug)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
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

        {/* Grid */}
      <div className="px-4 pb-6">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square">
                <Skeleton className="w-full h-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : artworks.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">🎨</div>
            <h3 className="text-base font-semibold mb-2">Nenhum design ainda</h3>
            <p className="text-sm text-muted-foreground mb-5">
              {selectedStyle !== "all"
                ? "Nenhum design neste estilo ainda. Seja o primeiro!"
                : "A galeria está vazia. Seja o primeiro a criar!"}
            </p>
            <Link href="/create">
              <button className="bg-primary text-primary-foreground rounded-lg px-5 py-2.5 text-sm font-medium">
                Criar design
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {artworks.map((artwork, i) => (
              <motion.div
                key={artwork.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
              >
                <button
                  className="w-full text-left"
                  onClick={() => setActiveArtwork(artwork)}
                >
                  <div className="bg-card rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow">
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={artwork.imageUrl}
                        alt={artwork.prompt}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="px-2 py-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                        {artwork.authorName ?? "Anônimo"}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Heart className="w-3 h-3" />
                        {artwork.likes}
                      </span>
                    </div>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {gallery && gallery.total > 0 && (
          <p className="text-center text-xs text-muted-foreground mt-6">
            Mostrando {artworks.length} de {gallery.total} designs
          </p>
        )}
      </div>

      <ArtworkDetailModal
        artwork={activeArtwork}
        onClose={() => setActiveArtwork(null)}
      />
    </div>
  );
}
