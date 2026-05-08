import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetStyles } from "@workspace/api-client-react";
import { useGetGallery } from "@workspace/api-client-react";
import { Wand2, ArrowRight, Heart, Palette, Zap, Shirt } from "lucide-react";
import { motion } from "framer-motion";
import { TshirtMockup } from "@/components/TshirtMockup";

const STYLE_EMOJIS: Record<string, string> = {
  "cyberpunk-neon": "⚡",
  "minimalismo-japones": "🌸",
  "dark-rock-stipple": "🤘",
  "vaporwave-retro": "🌴",
  "vector-pop-art": "🎨",
};

const HERO_COLORS = [
  { key: "white",    hex: "#F5F5F0", label: "Branca"  },
  { key: "black",    hex: "#1A1A1A", label: "Preta"   },
  { key: "navy",     hex: "#1E2A4A", label: "Marinho" },
  { key: "sage",     hex: "#7C9A7E", label: "Sálvia"  },
  { key: "sand",     hex: "#C9A97A", label: "Areia"   },
];

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const [heroColor, setHeroColor] = useState("white");
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
      <section className="px-4 pt-8 pb-6 md:pt-16 md:pb-12 max-w-7xl mx-auto sm:px-6 lg:px-8">
        <div className="md:grid md:grid-cols-2 md:gap-12 md:items-center">
          <div>
            <h1 className="font-display text-[28px] md:text-[42px] lg:text-[52px] leading-tight mb-3 text-foreground">
              Crie sua Camiseta Única com IA
            </h1>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-6 md:mb-8 max-w-lg">
              Descreva sua ideia e nossa IA gera um design exclusivo em segundos.
              Sem cadastro para as primeiras 3 criações.
            </p>

            <div className="space-y-3 max-w-lg">
              <textarea
                className="w-full h-[110px] md:h-[130px] px-4 py-3 border border-border rounded-xl text-sm bg-card resize-none outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
                placeholder="Ex: Um astronauta surfando em Saturno, estilo aquarela..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
                }}
              />
              <button
                onClick={handleGenerate}
                className="w-full bg-primary text-primary-foreground rounded-xl py-3.5 md:py-4 text-sm md:text-base font-medium flex items-center justify-center gap-2 hover:opacity-90 active:opacity-90 transition-opacity"
              >
                <Wand2 className="w-5 h-5" />
                Gerar Design
              </button>
              <p className="text-center text-xs text-muted-foreground">
                3 criações gratuitas · Sem cadastro necessário
              </p>
            </div>
          </div>

          {/* Desktop: featured mockup preview on right */}
          <div className="hidden md:flex flex-col items-center gap-4">
            <div className="w-full max-w-[340px]">
              <TshirtMockup
                artworkUrl={featuredArtworks[0]?.imageUrl ?? null}
                color={heroColor}
                altText={featuredArtworks[0]?.prompt ?? "Prévia da camiseta"}
              />
            </div>
            {/* Color switcher */}
            <div className="flex items-center gap-2">
              {HERO_COLORS.map(({ key, hex, label }) => (
                <button
                  key={key}
                  title={label}
                  onClick={() => setHeroColor(key)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${heroColor === key ? "border-primary scale-110 shadow-md" : "border-border hover:border-primary/50"}`}
                  style={{ background: hex }}
                />
              ))}
            </div>
            {featuredArtworks[0] && (
              <p className="text-xs text-muted-foreground text-center max-w-[260px] line-clamp-2 italic">
                "{featuredArtworks[0].prompt}"
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Mobile style pills */}
      {styles && styles.length > 0 && (
        <section className="md:hidden px-4 mb-6">
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

      {/* How it works — desktop only */}
      <section className="hidden md:block py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Como funciona</h2>
            <p className="text-muted-foreground text-sm">Do prompt à camiseta em 3 passos</p>
          </div>
          <div className="grid grid-cols-3 gap-8">
            {[
              { icon: Palette, step: "01", title: "Descreva sua ideia", desc: "Escreva qualquer conceito — animal, frase, abstrato." },
              { icon: Zap,     step: "02", title: "IA gera o design",   desc: "Gemini cria uma arte única otimizada para estampa."  },
              { icon: Shirt,   step: "03", title: "Peça sua camiseta",  desc: "Escolha modelo, cor e tamanho. Entregamos na porta." },
            ].map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="text-center relative">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-4">
                  <Icon className="w-7 h-7" />
                </div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 text-6xl font-black text-muted-foreground/10 select-none pointer-events-none">
                  {step}
                </div>
                <h3 className="text-base font-bold mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community gallery */}
      {featuredArtworks.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mt-6 md:mt-12 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base md:text-xl font-semibold text-foreground">Criações da Comunidade</h2>
            <Link href="/gallery" className="flex items-center gap-1 text-sm text-primary font-medium">
              Ver tudo <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
            {featuredArtworks.map((artwork, i) => (
              <motion.div
                key={artwork.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Link href={`/product/${artwork.id}`}>
                  <div className="bg-card rounded-xl overflow-hidden border border-border shadow-sm cursor-pointer hover:shadow-md transition-shadow group">
                    <div className="aspect-square overflow-hidden p-1">
                      <TshirtMockup
                        artworkUrl={artwork.imageUrl}
                        color="white"
                        altText={artwork.prompt}
                      />
                    </div>
                    <div className="px-2 py-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground truncate max-w-[80%]">
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
        <section className="px-4 mt-8 text-center pb-8">
          <div className="text-4xl mb-3">🎨</div>
          <p className="text-sm text-muted-foreground">Seja o primeiro a criar um design!</p>
          <Link href="/create">
            <button className="mt-4 bg-primary text-primary-foreground rounded-xl px-6 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity">
              Criar agora
            </button>
          </Link>
        </section>
      )}
    </div>
  );
}
