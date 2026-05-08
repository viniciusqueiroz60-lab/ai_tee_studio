import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetStyles } from "@workspace/api-client-react";
import { useGetGallery } from "@workspace/api-client-react";
import { Wand2, ArrowRight, Heart, Palette, Zap, Shirt, ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

          {/* Desktop: "Seu Design" box + "Sua Camiseta" — identical to create page */}
          <div className="hidden md:flex flex-col gap-4">
            {/* "Seu Design" preview box */}
            <AnimatePresence mode="wait">
              {featuredArtworks[0] ? (
                <motion.div key={featuredArtworks[0].id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
                  className="relative aspect-square rounded-2xl overflow-hidden border border-border shadow-xl"
                >
                  <img src={featuredArtworks[0].imageUrl} alt={featuredArtworks[0].prompt} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-white text-xs line-clamp-2 italic opacity-80">"{featuredArtworks[0].prompt}"</p>
                  </div>
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

            {/* "Sua Camiseta" section */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="grid grid-cols-[1fr_1.2fr]">
                <div className="p-3 bg-muted/20 flex items-center justify-center">
                  <TshirtMockup
                    artworkUrl={featuredArtworks[0]?.imageUrl ?? null}
                    color={heroColor}
                    altText={featuredArtworks[0]?.prompt ?? "Prévia da camiseta"}
                  />
                </div>
                <div className="p-4 flex flex-col gap-3">
                  <p className="text-sm font-semibold text-foreground">Sua Camiseta</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {HERO_COLORS.map(({ key, hex, label }) => (
                      <button
                        key={key}
                        title={label}
                        onClick={() => setHeroColor(key)}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${heroColor === key ? "border-primary scale-110 shadow-md" : "border-border hover:border-primary/50"}`}
                        style={{ background: hex }}
                      />
                    ))}
                  </div>
                  <Link href={featuredArtworks[0] ? `/product/${featuredArtworks[0].id}` : "/create"}>
                    <button className="w-full bg-primary text-primary-foreground rounded-xl py-2 text-xs font-medium flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity">
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Pedir camiseta
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile: "Seu Design" + "Sua Camiseta" cards — identical to create page */}
      <section className="md:hidden px-4 mt-4 mb-2">
        <div className="grid gap-3" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
          {/* Left: "Seu Design" card */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-3 pt-3 pb-2">
              <p className="text-[11px] font-semibold text-foreground">Seu Design</p>
            </div>
            <div className="px-3 pb-3">
              <AnimatePresence mode="wait">
                {featuredArtworks[0] ? (
                  <motion.div key={featuredArtworks[0].id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                    <div className="aspect-square rounded-xl overflow-hidden">
                      <img src={featuredArtworks[0].imageUrl} alt={featuredArtworks[0].prompt} className="w-full h-full object-cover" />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="aspect-square rounded-xl border-2 border-dashed border-border/60 bg-muted/20 flex flex-col items-center justify-center gap-2 text-muted-foreground"
                  >
                    <Wand2 className="w-8 h-8 opacity-20" />
                    <p className="text-[9px] text-center px-2 opacity-50 leading-tight">Descreva e<br/>clique em Gerar</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="border-t border-border flex">
              <Link href="/create" className="flex-1">
                <div className="flex flex-col items-center justify-center gap-0.5 py-2.5 text-primary hover:opacity-80 transition-opacity">
                  <Wand2 className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-medium">Criar</span>
                </div>
              </Link>
              <Link href={featuredArtworks[0] ? `/product/${featuredArtworks[0].id}` : "/create"} className="flex-1 border-l border-border">
                <div className="flex flex-col items-center justify-center gap-0.5 py-2.5 text-muted-foreground hover:text-foreground transition-colors">
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span className="text-[9px]">Pedir</span>
                </div>
              </Link>
            </div>
          </div>

          {/* Right: "Sua Camiseta" card */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="px-3 pt-3 pb-2">
              <p className="text-[11px] font-semibold text-foreground">Sua Camiseta</p>
            </div>
            <div className="px-3 pb-2 flex-1">
              <TshirtMockup
                artworkUrl={featuredArtworks[0]?.imageUrl ?? null}
                color={heroColor}
                altText={featuredArtworks[0]?.prompt ?? "Prévia"}
              />
            </div>
            <div className="px-3 pb-3 flex gap-1.5 flex-wrap justify-center">
              {HERO_COLORS.map(({ key, hex, label }) => (
                <button
                  key={key}
                  title={label}
                  onClick={() => setHeroColor(key)}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${heroColor === key ? "border-primary scale-110" : "border-border"}`}
                  style={{ background: hex }}
                />
              ))}
            </div>
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
