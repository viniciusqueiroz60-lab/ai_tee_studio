import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetStyles } from "@workspace/api-client-react";
import { useGetGallery } from "@workspace/api-client-react";
import { Wand2, ArrowRight, Heart } from "lucide-react";
import { motion } from "framer-motion";

const STYLE_EMOJIS: Record<string, string> = {
  "cyberpunk-neon": "⚡",
  "minimalismo-japones": "🌸",
  "dark-rock-stipple": "🤘",
  "vaporwave-retro": "🌴",
  "vector-pop-art": "🎨",
};

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const [, navigate] = useLocation();

  const { data: styles } = useGetStyles();
  const { data: gallery } = useGetGallery({ sort: "popular", limit: 8 });
  const featuredArtworks = gallery?.artworks?.slice(0, 8) ?? [];

  function handleGenerate() {
    if (!prompt.trim()) {
      navigate("/create");
      return;
    }
    navigate(`/create?prompt=${encodeURIComponent(prompt.trim())}`);
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="px-4 pt-6 pb-4">
        <h1 className="font-display text-[28px] leading-tight mb-2 text-foreground">
          Crie sua Camiseta Única
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Descreva sua ideia e nossa IA cria para você
        </p>

        <div className="mt-4">
          <textarea
            className="w-full h-[120px] px-4 py-3 border border-border rounded-lg text-sm bg-card resize-none outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
            placeholder="Ex: Um astronauta surfando em Saturno, estilo aquarela..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
            }}
          />
        </div>

        <button
          onClick={handleGenerate}
          className="w-full mt-3 bg-primary text-primary-foreground rounded-lg py-3.5 text-base font-medium flex items-center justify-center gap-2 active:opacity-90 transition-opacity"
        >
          <Wand2 className="w-5 h-5" />
          Gerar Design
        </button>

        <p className="text-center text-xs text-muted-foreground mt-2">
          3 criações gratuitas · Sem cadastro
        </p>
      </section>

      {/* Styles */}
      {styles && styles.length > 0 && (
        <section className="px-4 mt-2">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Estilos</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {styles.map((style) => (
              <Link key={style.slug} href={`/create?style=${style.slug}`}>
                <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full border border-border bg-card text-sm whitespace-nowrap hover:border-primary hover:text-primary transition-colors cursor-pointer">
                  <span>{STYLE_EMOJIS[style.slug] ?? style.icon ?? "🎨"}</span>
                  <span>{style.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Community gallery */}
      {featuredArtworks.length > 0 && (
        <section className="px-4 mt-6 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground">Criações da Comunidade</h2>
            <Link href="/gallery" className="flex items-center gap-1 text-sm text-primary font-medium">
              Ver tudo <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {featuredArtworks.map((artwork, i) => (
              <motion.div
                key={artwork.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Link href={`/product/${artwork.id}`}>
                  <div className="bg-card rounded-xl overflow-hidden border border-border shadow-sm cursor-pointer hover:shadow-md transition-shadow">
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
                        {artwork.likes ?? 0}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {featuredArtworks.length === 0 && (
        <section className="px-4 mt-8 text-center">
          <div className="text-4xl mb-3">🎨</div>
          <p className="text-sm text-muted-foreground">Seja o primeiro a criar um design!</p>
          <Link href="/create">
            <button className="mt-4 bg-primary text-primary-foreground rounded-lg px-6 py-2.5 text-sm font-medium">
              Criar agora
            </button>
          </Link>
        </section>
      )}
    </div>
  );
}
