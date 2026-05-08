import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useGetMyArtworks } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Image, Plus, Share2, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";

export default function MyArtworksPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const { data: artworks, isLoading } = useGetMyArtworks();

  if (loading || !user) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 md:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div>
            <h1 className="font-display text-2xl md:text-3xl mb-1">Meus Designs</h1>
            <p className="text-muted-foreground">Todos os seus designs criados com IA</p>
          </div>
          <Button asChild className="gap-2">
            <Link href="/create">
              <Plus className="w-4 h-4" />
              Novo design
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-2xl" />)}
          </div>
        ) : !artworks || artworks.length === 0 ? (
          <div className="text-center py-24">
            <Image className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-xl font-semibold mb-2">Nenhum design ainda</h3>
            <p className="text-muted-foreground mb-8">
              Crie seu primeiro design com IA
            </p>
            <Button asChild>
              <Link href="/create">Criar primeiro design</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {artworks.map((artwork, i) => (
              <motion.div
                key={artwork.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="group relative rounded-2xl overflow-hidden border border-border bg-card aspect-square">
                  <img
                    src={artwork.imageUrl}
                    alt={artwork.prompt}
                    className="w-full h-full object-cover"
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-2">
                      <p className="text-white text-xs line-clamp-2">{artwork.prompt}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" className="flex-1 h-8 gap-1 text-xs" asChild>
                          <Link href={`/product/${artwork.id}`}>
                            <ShoppingCart className="w-3 h-3" />
                            Pedir
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Status badges */}
                  <div className="absolute top-2 left-2 flex gap-1">
                    {artwork.isShared && (
                      <Badge
                        variant="secondary"
                        className={`text-xs ${
                          artwork.moderationStatus === "approved"
                            ? "bg-green-500/80 text-white"
                            : artwork.moderationStatus === "rejected"
                            ? "bg-red-500/80 text-white"
                            : "bg-yellow-500/80 text-white"
                        } border-0`}
                      >
                        {artwork.moderationStatus === "approved" ? "✓ Publicado" : artwork.moderationStatus === "rejected" ? "✗ Rejeitado" : "Em revisão"}
                      </Badge>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
