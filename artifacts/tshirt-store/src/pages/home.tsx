import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetStyles } from "@workspace/api-client-react";
import { useGetGallery } from "@workspace/api-client-react";
import { Zap, ArrowRight, Star, Palette, Shirt } from "lucide-react";
import { motion } from "framer-motion";

const STYLE_EMOJIS: Record<string, string> = {
  "cyberpunk-neon": "⚡",
  "minimalismo-japones": "🌸",
  "dark-rock-stipple": "🤘",
  "vaporwave-retro": "🌴",
  "vector-pop-art": "🎨",
};

export default function HomePage() {
  const { data: styles } = useGetStyles();
  const { data: gallery } = useGetGallery({ sort: "popular", limit: 6 });

  const featuredArtworks = gallery?.artworks?.slice(0, 6) ?? [];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 dark:from-primary/10 dark:to-purple-500/10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <Badge className="mb-6 gap-1.5 text-sm px-3 py-1">
              <Zap className="w-3.5 h-3.5" />
              Powered by Gemini AI
            </Badge>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-6">
              Seu design,{" "}
              <span className="gradient-text">gerado por IA</span>
              <br />
              em segundos
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Descreva sua ideia, escolha um estilo artístico e nossa IA cria um design exclusivo para sua camiseta. Sem limites criativos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-base px-8 h-12 gap-2" asChild>
                <Link href="/create">
                  <Zap className="w-5 h-5" />
                  Criar meu design grátis
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8 h-12 gap-2" asChild>
                <Link href="/gallery">
                  Ver galeria
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              3 criações gratuitas · Sem cadastro necessário
            </p>
          </motion.div>
        </div>
      </section>

      {/* Styles */}
      {styles && styles.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Estilos Artísticos</h2>
              <p className="text-muted-foreground">Cada estilo é treinado para resultados únicos em camiseta</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {styles.map((style, i) => (
                <motion.div
                  key={style.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <Link href={`/create?style=${style.slug}`}>
                    <div className="group cursor-pointer p-5 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-lg transition-all duration-200 text-center">
                      <div className="text-4xl mb-3">{STYLE_EMOJIS[style.slug] ?? style.icon ?? "🎨"}</div>
                      <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                        {style.label}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{style.description}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Gallery preview */}
      {featuredArtworks.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold">Designs em Destaque</h2>
                <p className="text-muted-foreground mt-1">Criações da nossa comunidade</p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/gallery">
                  Ver tudo <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {featuredArtworks.map((artwork, i) => (
                <motion.div
                  key={artwork.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <Link href={`/product/${artwork.id}`}>
                    <div className="group relative rounded-2xl overflow-hidden border border-border bg-card aspect-square cursor-pointer hover:shadow-xl transition-all duration-300">
                      <img
                        src={artwork.imageUrl}
                        alt={artwork.prompt}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="absolute bottom-3 left-3 right-3">
                          <p className="text-white text-xs line-clamp-2">{artwork.prompt}</p>
                          {artwork.styleLabel && (
                            <Badge variant="secondary" className="mt-1 text-xs bg-white/20 text-white border-white/30">
                              {artwork.styleLabel}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Como funciona</h2>
            <p className="text-muted-foreground">Do prompt à camiseta em 3 passos</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                icon: <Palette className="w-8 h-8" />,
                step: "01",
                title: "Descreva sua ideia",
                desc: "Escreva qualquer conceito — animal, frase, abstrato. Nossa IA entende."
              },
              {
                icon: <Zap className="w-8 h-8" />,
                step: "02",
                title: "IA gera o design",
                desc: "Gemini cria uma arte única otimizada para estampa de camiseta."
              },
              {
                icon: <Shirt className="w-8 h-8" />,
                step: "03",
                title: "Peça sua camiseta",
                desc: "Escolha o modelo, cor e tamanho. Entregamos na sua porta."
              }
            ].map((item, i) => (
              <div key={i} className="relative text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
                  {item.icon}
                </div>
                <div className="absolute top-2 left-1/2 -translate-x-1/2 -translate-y-full text-7xl font-black text-muted/20 select-none">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-primary text-primary" />
            ))}
          </div>
          <h2 className="text-4xl font-black mb-4">
            Pronto para criar algo{" "}
            <span className="gradient-text">incrível?</span>
          </h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Comece com 3 criações gratuitas. Sem cartão de crédito.
          </p>
          <Button size="lg" className="px-10 h-12 text-base gap-2" asChild>
            <Link href="/create">
              <Zap className="w-5 h-5" />
              Criar agora — é grátis
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
