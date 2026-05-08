import { useState } from "react";
import { Link } from "wouter";
import { useGetGallery, useGetStyles } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Heart, Eye, ShoppingCart, TrendingUp, Clock } from "lucide-react";
import { motion } from "framer-motion";

const STYLE_EMOJIS: Record<string, string> = {
  "cyberpunk-neon": "⚡",
  "minimalismo-japones": "🌸",
  "dark-rock-stipple": "🤘",
  "vaporwave-retro": "🌴",
  "vector-pop-art": "🎨",
};

export default function GalleryPage() {
  const [selectedStyle, setSelectedStyle] = useState<string>("all");
  const [sort, setSort] = useState<"recent" | "popular">("recent");

  const { data: styles } = useGetStyles();
  const { data: gallery, isLoading } = useGetGallery({
    style: selectedStyle !== "all" ? selectedStyle : undefined,
    sort,
    limit: 24,
  });

  const artworks = gallery?.artworks ?? [];

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-2">Galeria da Comunidade</h1>
          <p className="text-muted-foreground">Designs criados com IA pela nossa comunidade</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          {/* Style tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedStyle("all")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedStyle === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Todos
            </button>
            {styles?.map((style) => (
              <button
                key={style.slug}
                onClick={() => setSelectedStyle(style.slug)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                  selectedStyle === style.slug
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <span>{STYLE_EMOJIS[style.slug] ?? style.icon ?? "🎨"}</span>
                {style.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Select value={sort} onValueChange={(v) => setSort(v as "recent" | "popular")}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">
                  <span className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" /> Recentes
                  </span>
                </SelectItem>
                <SelectItem value="popular">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5" /> Populares
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-square">
                <Skeleton className="w-full h-full rounded-2xl" />
              </div>
            ))}
          </div>
        ) : artworks.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🎨</div>
            <h3 className="text-lg font-semibold mb-2">Nenhum design ainda</h3>
            <p className="text-muted-foreground mb-6">
              {selectedStyle !== "all"
                ? "Nenhum design neste estilo ainda. Seja o primeiro!"
                : "A galeria está vazia. Seja o primeiro a criar!"}
            </p>
            <Button asChild>
              <Link href="/create">Criar design</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {artworks.map((artwork, i) => (
              <motion.div
                key={artwork.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
              >
                <Link href={`/product/${artwork.id}`}>
                  <div className="group relative rounded-2xl overflow-hidden border border-border bg-card aspect-square cursor-pointer hover:shadow-xl hover:border-primary/30 transition-all duration-300">
                    <img
                      src={artwork.imageUrl}
                      alt={artwork.prompt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-white text-xs line-clamp-2 mb-2">{artwork.prompt}</p>
                        <div className="flex items-center justify-between">
                          {artwork.styleLabel && (
                            <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                              {artwork.styleLabel}
                            </Badge>
                          )}
                          <div className="flex items-center gap-2 text-white/80 text-xs ml-auto">
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              {artwork.likes}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {artwork.views}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                        <ShoppingCart className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Stats */}
        {gallery && gallery.total > 0 && (
          <p className="text-center text-sm text-muted-foreground mt-8">
            Mostrando {artworks.length} de {gallery.total} designs
          </p>
        )}
      </div>
    </div>
  );
}
