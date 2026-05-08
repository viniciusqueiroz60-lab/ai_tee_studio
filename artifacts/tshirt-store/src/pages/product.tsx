import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetArtwork, useGetTshirtModels, useLikeArtwork, useUnlikeArtwork } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiJson } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Heart, ShoppingCart, Loader2, ArrowLeft, Share2, Lock, AlertCircle
} from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const SIZES = ["PP", "P", "M", "G", "GG", "XGG"];

const COLOR_MAP: Record<string, string> = {
  white: "#FFFFFF",
  black: "#1a1a1a",
  gray: "#9ca3af",
  charcoal: "#374151",
  navy: "#1e3a5f",
  red: "#ef4444",
  sand: "#d4c5a9",
  sage: "#87a878",
};

export default function ProductPage() {
  const [, params] = useRoute("/product/:id");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const artworkId = parseInt(params?.id ?? "0", 10);

  const { data: artwork, isLoading: artworkLoading } = useGetArtwork(artworkId);
  const { data: models, isLoading: modelsLoading } = useGetTshirtModels();

  const [selectedModel, setSelectedModel] = useState<number | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>("M");
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    if (artwork) {
      setLikesCount(artwork.likes ?? 0);
    }
  }, [artwork]);

  useEffect(() => {
    if (models && models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].id);
      const colors = models[0].availableColors ?? [];
      if (colors.length > 0) setSelectedColor(colors[0]);
    }
  }, [models]);

  const currentModel = models?.find((m) => m.id === selectedModel);

  async function handleLike() {
    if (!user) { navigate("/auth"); return; }
    try {
      if (liked) {
        setLiked(false);
        setLikesCount((c) => Math.max(0, c - 1));
        await apiJson(`/artworks/${artworkId}/like`, { method: "DELETE" });
      } else {
        setLiked(true);
        setLikesCount((c) => c + 1);
        await apiJson(`/artworks/${artworkId}/like`, { method: "POST" });
      }
    } catch {
      setLiked((l) => !l);
      setLikesCount((c) => liked ? c + 1 : c - 1);
    }
  }

  async function handleCheckout() {
    if (!user) { navigate("/auth"); return; }
    if (!selectedModel || !selectedColor) return;

    setCheckingOut(true);
    setCheckoutError(null);
    try {
      const result = await apiJson<{ url: string }>("/checkout", {
        method: "POST",
        body: JSON.stringify({
          artworkId,
          modelId: selectedModel,
          color: selectedColor,
          size: selectedSize,
        }),
      });
      window.location.href = result.url;
    } catch (e: any) {
      setCheckoutError(e.message ?? "Erro ao processar pagamento");
    } finally {
      setCheckingOut(false);
    }
  }

  if (artworkLoading || modelsLoading) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!artwork) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Design não encontrado</h2>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/gallery">Ver galeria</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back */}
        <Button variant="ghost" size="sm" className="mb-6 gap-2" asChild>
          <Link href="/gallery">
            <ArrowLeft className="w-4 h-4" /> Galeria
          </Link>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Artwork */}
          <div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative rounded-2xl overflow-hidden border border-border shadow-2xl aspect-square"
            >
              <img
                src={artwork.imageUrl}
                alt={artwork.prompt}
                className="w-full h-full object-cover"
              />
              {artwork.styleLabel && (
                <div className="absolute top-4 left-4">
                  <Badge className="bg-black/60 text-white border-0 backdrop-blur-sm">
                    {artwork.styleLabel}
                  </Badge>
                </div>
              )}
            </motion.div>

            <div className="flex items-center justify-between mt-4">
              <div>
                <p className="text-sm text-muted-foreground line-clamp-2">{artwork.prompt}</p>
                {artwork.authorName && (
                  <p className="text-xs text-muted-foreground mt-1">por {artwork.authorName}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                    liked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
                  }`}
                >
                  <Heart className={`w-5 h-5 ${liked ? "fill-red-500" : ""}`} />
                  {likesCount}
                </button>
              </div>
            </div>
          </div>

          {/* Order form */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black mb-1">Pedir sua camiseta</h1>
              <p className="text-muted-foreground">Configure e finalize seu pedido</p>
            </div>

            {!user && (
              <Alert>
                <Lock className="w-4 h-4" />
                <AlertDescription>
                  <Link href="/auth" className="font-semibold underline">Entre ou cadastre-se</Link>{" "}
                  para finalizar seu pedido
                </AlertDescription>
              </Alert>
            )}

            {/* Model selection */}
            {models && models.length > 0 && (
              <div>
                <label className="text-sm font-semibold mb-3 block">Modelo</label>
                <RadioGroup
                  value={String(selectedModel)}
                  onValueChange={(v) => {
                    const id = parseInt(v, 10);
                    setSelectedModel(id);
                    const m = models.find((m) => m.id === id);
                    if (m?.availableColors?.[0]) setSelectedColor(m.availableColors[0]);
                  }}
                  className="space-y-2"
                >
                  {models.map((model) => (
                    <div key={model.id} className="flex items-center space-x-3">
                      <RadioGroupItem value={String(model.id)} id={`model-${model.id}`} />
                      <Label
                        htmlFor={`model-${model.id}`}
                        className="flex items-center justify-between w-full cursor-pointer"
                      >
                        <div>
                          <span className="font-medium">{model.name}</span>
                          {model.description && (
                            <p className="text-xs text-muted-foreground">{model.description}</p>
                          )}
                        </div>
                        <span className="font-bold text-primary">
                          R$ {model.price.toFixed(2).replace(".", ",")}
                        </span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Color */}
            {currentModel && currentModel.availableColors.length > 0 && (
              <div>
                <label className="text-sm font-semibold mb-3 block">
                  Cor: <span className="font-normal text-muted-foreground capitalize">{selectedColor}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {currentModel.availableColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-9 h-9 rounded-full border-2 transition-all ${
                        selectedColor === color
                          ? "border-primary scale-110 shadow-md"
                          : "border-border hover:border-primary/50"
                      }`}
                      style={{
                        backgroundColor: COLOR_MAP[color] ?? color,
                        boxShadow: color === "white" ? "inset 0 0 0 1px rgba(0,0,0,0.1)" : undefined,
                      }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Size */}
            <div>
              <label className="text-sm font-semibold mb-3 block">Tamanho</label>
              <div className="flex flex-wrap gap-2">
                {SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      selectedSize === size
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Price summary */}
            {currentModel && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-2xl font-black text-primary">
                        R$ {currentModel.price.toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>Frete a calcular</p>
                      <p>Entrega em 7-14 dias úteis</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {checkoutError && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{checkoutError}</AlertDescription>
              </Alert>
            )}

            <Button
              className="w-full h-12 text-base gap-2"
              onClick={handleCheckout}
              disabled={checkingOut || !selectedModel || !selectedColor || !user}
            >
              {checkingOut ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Redirecionando...</>
              ) : !user ? (
                <><Lock className="w-5 h-5" /> Entre para comprar</>
              ) : (
                <><ShoppingCart className="w-5 h-5" /> Finalizar pedido</>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Pagamento seguro via Stripe · Masterizado em alta resolução para impressão
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
