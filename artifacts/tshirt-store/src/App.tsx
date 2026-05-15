import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Coins, 
  Menu, 
  Palette, 
  LayoutDashboard, 
  Settings, 
  ArrowRight, 
  Download, 
  Maximize2, 
  Rotate3d, 
  ShoppingBag, 
  X, 
  Minus, 
  Plus, 
  Heart, 
  ShoppingCart, 
  TrendingUp,
  Wallet,
  Check,
  User as UserIcon,
  LogOut,
  Sparkles,
  History,
  Image as ImageIcon,
  Flame,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// Firebase
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Local
import { Page, UserProfile, Design, Foundation, ColorOption } from './types.ts';
import { generateDesignPrompt, generateDesignImage, refineDesignImage } from './services/geminiService.ts';
import { removeWhiteBackground } from './services/imageUtils.ts';
import { ProcessedPreviewImage } from './components/ProcessedPreviewImage.tsx';
import stylesData from '../styles.json';

// --- INITIALIZE FIREBASE ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);


// --- DATA ---
const COLORS: ColorOption[] = [
  { id: 'white', name: 'Branco', hex: '#FFFFFF', filename: 'branca.png' },
  { id: 'black', name: 'Preto', hex: '#1A1A1A', filename: 'preta.png' },
  { id: 'gray', name: 'Cinza', hex: '#4A4A4A', filename: 'cinza.png' },
  { id: 'sand', name: 'Areia', hex: '#D2B48C', filename: 'areia.png' },
  { id: 'sage', name: 'Sage', hex: '#879485', filename: 'sage.png' },
];

// --- HELPERS ---

const handleFirestoreError = (error: unknown, operationType: string, path: string | null) => {
  const auth = getAuth(app);
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

// --- COMPONENTS ---

const Header = ({ page, setPage, user, onLogin, onLogout }: { 
  page: Page, 
  setPage: (p: Page) => void, 
  user: UserProfile | null, 
  onLogin: () => void,
  onLogout: () => void
}) => {
  return (
    <header className="sticky top-0 z-50 w-full h-[60px] bg-surface/70 backdrop-blur-xl border-b border-outline-subtle/30 shadow-sm transition-all duration-300">
      <div className="flex justify-between items-center px-4 md:px-10 h-full w-full max-w-7xl mx-auto">
        <div className="flex items-center h-full cursor-pointer" onClick={() => setPage('workshop')}>
          <div className="h-full w-auto rounded-lg flex items-center justify-center">
            <img src="/logo.png" alt="Logo" className="h-full w-auto object-contain" />
          </div>
        </div>
        
        <nav className="flex gap-4 md:gap-8 items-center">
          <button 
            onClick={() => setPage('workshop')}
            className={`text-sm font-bold transition-all ${page === 'workshop' ? 'text-primary border-b-2 border-primary pb-1' : 'text-gray-500 hover:text-primary'}`}
          >
            Oficina
          </button>
          <button 
            onClick={() => setPage('gallery')}
            className={`text-sm font-bold transition-all ${page === 'gallery' ? 'text-primary border-b-2 border-primary pb-1' : 'text-gray-500 hover:text-primary'}`}
          >
            Galeria
          </button>
          {user && (
            <button 
              onClick={() => setPage('dashboard')}
              className={`text-sm font-bold transition-all ${page === 'dashboard' ? 'text-primary border-b-2 border-primary pb-1' : 'text-gray-500 hover:text-primary'}`}
            >
              Painel
            </button>
          )}
        </nav>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-2 bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10">
                <Coins className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-primary">{user.tokens} Tokens</span>
              </div>
              <div className="group relative">
                <div className="w-9 h-9 rounded-full border-2 border-primary/20 p-0.5 overflow-hidden cursor-pointer active:scale-90 transition-transform">
                  <img src={user.avatar} alt="avatar" className="w-full h-full object-cover rounded-full" />
                </div>
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-outline-subtle opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all py-2 z-[60]">
                  <div className="px-4 py-2 border-b border-outline-subtle/30 mb-2">
                    <p className="text-xs font-bold text-gray-900 truncate">{user.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                  </div>
                  <button onClick={() => setPage('dashboard')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4" /> Ver Painel
                  </button>
                  <button onClick={onLogout} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2">
                    <LogOut className="w-4 h-4" /> Sair
                  </button>
                </div>
              </div>
            </>
          ) : (
            <button 
              onClick={onLogin}
              className="bg-primary text-white text-sm font-bold px-5 py-2 rounded-xl hover:bg-primary-dark transition-all shadow-md active:scale-95"
            >
              Entrar
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

const WorkshopPage = ({ 
  user, 
  onShowLogin, 
  onFinalize,
  onDeductToken 
}: { 
  user: UserProfile | null, 
  onShowLogin: () => void, 
  onFinalize: (d: Design) => void,
  onDeductToken: () => Promise<boolean>
}) => {
  const [selectedStyleId, setSelectedStyleId] = useState(stylesData.style_presets[0].id);
  const [artisticConcept, setArtisticConcept] = useState('');
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [selectedColor, setSelectedColor] = useState('white');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentDesign, setCurrentDesign] = useState<Design | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  const handleInitialGenerate = async () => {
    if (!artisticConcept) return;
    setIsGenerating(true);
    try {
      const style = stylesData.style_presets.find(s => s.id === selectedStyleId);
      const enrichment = style ? style.enrichment : '';
      const technicalConstraints = stylesData.technical_constraints.print_optimization;
      
      const technicalPrompt = await generateDesignPrompt(artisticConcept, enrichment, technicalConstraints);
      const rawImageUrl = await generateDesignImage(technicalPrompt);
      const imageUrl = await removeWhiteBackground(rawImageUrl);
      
      const newDesign: Design = {
        id: `design_${Date.now()}`,
        ownerId: user?.uid || 'guest',
        title: artisticConcept.slice(0, 20) + '...',
        createdAt: new Date(),
        image: imageUrl,
        prompt: technicalPrompt,
        originalPrompt: artisticConcept,
        style: style ? style.label : 'Default',
        color: selectedColor,
        sales: 0
      };
      
      setCurrentDesign(newDesign);
    } catch (error) {
      console.error('Falha na geração:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async () => {
    if (!user) {
      onShowLogin();
      return;
    }
    if (!currentDesign || !refinementPrompt) return;
    
    const canRefine = await onDeductToken();
    if (!canRefine) return;

    setIsRefining(true);
    try {
      const rawRefinedImageUrl = await refineDesignImage(currentDesign.image, refinementPrompt);
      const refinedImageUrl = await removeWhiteBackground(rawRefinedImageUrl);
      setCurrentDesign({
        ...currentDesign,
        image: refinedImageUrl,
        prompt: `${currentDesign.prompt} - refined with: ${refinementPrompt}`
      });
      setRefinementPrompt('');
    } catch (error) {
      console.error('Erro no refinamento:', error);
    } finally {
      setIsRefining(false);
    }
  };

  const currentColorHex = COLORS.find(c => c.id === selectedColor)?.hex || '#FFFFFF';
  
  const getStylePreviewPath = () => {
    const styleId = selectedStyleId;
    const suffix = styleId === 'vintage-70s' ? '70s' : 
                   styleId === 'vintage-80s' ? '80s' : 
                   styleId === 'clean-minimal' ? 'clean' : 
                   styleId === 'fine-line' ? 'pure' : 
                   styleId === 'heavy-metal' ? 'heavy' : 
                   styleId === 'horror-show' ? 'horror' : 
                   styleId === 'japanese-ukiyo' ? 'japan' : 
                   styleId === 'linocut-craft' ? 'linocut' : 
                   styleId === 'pop-art' ? 'pop' : 
                   styleId === 'cyberpunk-noir' ? 'cyber' : 'pure';
    return `/styles/print-${suffix}.png`;
  };

  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="flex flex-col gap-10 py-10">

        <label className="text-xl font-bold text-gray-900">Estilos de Design</label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {stylesData.style_presets.map(s => (
            <button 
              key={s.id}
              onClick={() => setSelectedStyleId(s.id)}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 items-center text-center ${selectedStyleId === s.id ? 'border-primary bg-primary/5 shadow-md' : 'border-outline-subtle/30 hover:border-primary/50'}`}
            >
              <span className="text-xs font-bold">{s.label}</span>
            </button>
          ))}
        </div>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Lado Esquerdo: Inputs */}
        <div className="flex flex-col gap-6">
          <motion.div 
            layout
            className="bg-white p-6 rounded-3xl border border-outline-subtle/50 shadow-sm flex flex-col gap-6"
          >
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-gray-900">Artistic Concept</label>
                {!currentDesign && artisticConcept && (
                  <span className="text-[10px] font-bold text-green-500 flex items-center gap-1"><Sparkles className="w-2.5 h-2.5" /> Pronto</span>
                )}
              </div>
              <textarea 
                value={artisticConcept}
                onChange={(e) => setArtisticConcept(e.target.value)}
                placeholder="Describe the graphic for your t-shirt. E.g., An abstract, geometric representation of a mountain sunrise in a minimalist line-art style..."
                disabled={!!currentDesign}
                className="w-full min-h-[140px] resize-none rounded-2xl border border-outline-subtle bg-gray-50 p-4 text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50"
              />
              {currentDesign && (
                <button 
                  onClick={() => { setCurrentDesign(null); setArtisticConcept(''); }}
                  className="text-[10px] text-gray-400 hover:text-red-500 flex items-center gap-1 font-bold"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-900">Garment Base</label>
              <div className="flex flex-wrap gap-4">
                {COLORS.map(c => (
                  <button 
                    key={c.id}
                    onClick={() => setSelectedColor(c.id)}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${selectedColor === c.id ? 'border-primary ring-2 ring-primary/20' : 'border-outline-subtle'}`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  >
                    {selectedColor === c.id && <Check className={`w-4 h-4 ${c.id === 'white' ? 'text-black' : 'text-white'}`} />}
                  </button>
                ))}
              </div>
            </div>

            {!currentDesign ? (
              <button 
                onClick={handleInitialGenerate}
                disabled={isGenerating || !artisticConcept}
                className="w-full bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {isGenerating ? <Sparkles className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {isGenerating ? 'Generating...' : 'Generate Design'}
              </button>
            ) : (
                <button 
                  onClick={handleRefine}
                  disabled={isRefining || !refinementPrompt || !user}
                  className="w-full bg-graphite text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50"
                >
                  {isRefining ? <Sparkles className="w-5 h-5 animate-spin" /> : <History className="w-5 h-5" />}
                  {isRefining ? 'Refining...' : 'Refine Print'}
                </button>
            )}
          </motion.div>
        </div>

        {/* Lado Central: Pure Art */}
        <div className="bg-white rounded-3xl p-6 border border-outline-subtle/30 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-900">Pure Art</h3>
                <button onClick={() => {
                  if (currentDesign?.image) {
                    const link = document.createElement('a');
                    link.href = currentDesign.image;
                    link.download = 'artisan-print.png';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }
                }}>
                  <Download className="w-4 h-4 text-gray-400 hover:text-black cursor-pointer" />
                </button>
            </div>
            <div className="aspect-square bg-gray-100 rounded-2xl flex items-center justify-center overflow-hidden">
                {currentDesign ? (
                  <motion.img 
                    key={currentDesign.image}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    src={currentDesign.image} 
                    className="w-full h-full object-contain cursor-pointer"
                    onClick={() => setEnlargedImage(currentDesign.image)}
                    style={{ mixBlendMode: 'multiply' }}
                  />
                ) : (
                  <ProcessedPreviewImage 
                    src={getStylePreviewPath()}
                    className="w-full h-full object-cover opacity-50"
                    alt="Style Preview"
                  />
                )}
            </div>
        </div>

        {/* Lado Direito: Mockup */}
        <div className="bg-white rounded-3xl p-6 border border-outline-subtle/30 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-900">Realistic T-shirt Mockup</h3>
                <Rotate3d className="w-4 h-4 text-gray-400" />
            </div>
            <div className="aspect-square rounded-2xl overflow-hidden relative bg-white">
                <img 
                  src={`/t_shirt_templates/${COLORS.find(c => c.id === selectedColor)?.filename}`}
                  className="absolute inset-0 w-full h-full object-contain z-0"
                />
                <div className="absolute inset-0 flex items-center justify-center p-16 pointer-events-none z-10">
                  {currentDesign ? (
                      <motion.img 
                        key={currentDesign.image}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        src={currentDesign.image} 
                        className="w-full object-contain cursor-pointer pointer-events-auto scale-65"
                        onClick={() => setEnlargedImage(currentDesign.image)}
                        style={{ mixBlendMode: 'multiply', opacity: 1 }}
                      />
                  ) : (
                      <ProcessedPreviewImage
                        src={getStylePreviewPath()}
                        className="w-full object-contain cursor-pointer pointer-events-auto scale-65"
                        alt="Style Preview"
                      />
                  )}
                </div>
            </div>
             {currentDesign && (
                 <button 
                  onClick={() => onFinalize(currentDesign)}
                  className="w-full bg-primary text-white py-3 rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center gap-2 text-sm font-bold hover:bg-primary-dark transition-all"
                 >
                   <ShoppingBag className="w-4 h-4" /> Finalizar Artisan Print
                 </button>
               )}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Artes de clientes</h2>
        <div className="relative group">
          <button onClick={() => scroll('left')} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronLeft className="w-6 h-6 text-primary" />
          </button>
          <div ref={scrollRef} className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="flex-shrink-0 w-48 h-64 rounded-2xl overflow-hidden bg-gray-200">
                <img src={`https://picsum.photos/seed/${i}/400/600`} alt="arte" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <button onClick={() => scroll('right')} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight className="w-6 h-6 text-primary" />
          </button>
        </div>
      </section>
      {enlargedImage && (
        <div 
          className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={enlargedImage} className="max-w-full max-h-[90vh] rounded-2xl" />
            <button 
              onClick={() => setEnlargedImage(null)}
              className="absolute -top-4 -right-4 bg-white p-2 rounded-full shadow-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const DashboardPage = ({ user, designs }: { user: UserProfile, designs: Design[] }) => {
  return (
    <div className="flex flex-col gap-10 py-10">
       <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Painel do Artesão</h1>
          <p className="text-gray-500 mt-2">Visão geral das suas criações e desempenho comercial.</p>
        </div>
        <div className="bg-green-50 px-4 py-2 rounded-xl border border-green-100 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <span className="text-xs font-bold text-green-700">Artisan Elite Tier</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2rem] border border-outline-subtle shadow-sm flex flex-col justify-between h-56">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Saldo de Tokens</span>
            <Coins className="w-5 h-5 text-primary" />
          </div>
          <div className="mt-4">
            <p className="text-4xl font-bold">{user.tokens}</p>
            <p className="text-xs text-green-500 mt-1 font-bold">Recarga automática amanhã (+10)</p>
          </div>
          <button className="text-xs font-bold text-primary hover:underline self-start">Comprar Pacote Adicional</button>
        </div>

        <div className="bg-graphite p-8 rounded-[2rem] text-white flex flex-col justify-between h-56 shadow-xl">
          <div className="flex justify-between items-center opacity-60">
            <span className="text-xs font-bold uppercase tracking-widest">Rebates Acumulados</span>
            <Wallet className="w-5 h-5" />
          </div>
          <div className="mt-4">
            <p className="text-4xl font-bold text-alabaster">R$ {user.accumulatedDiscount.toFixed(2)}</p>
            <p className="text-[10px] opacity-60 mt-1 font-medium">Ganhos reais a partir de replicas da galeria.</p>
          </div>
          <button className="w-full bg-alabaster/10 hover:bg-alabaster/20 py-3 rounded-xl text-xs font-bold transition-all border border-alabaster/10">Resgatar como Crédito</button>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-outline-subtle shadow-sm flex flex-col justify-between h-56">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Vendas Concluídas</span>
            <ShoppingCart className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="mt-4">
            <p className="text-4xl font-bold">{user.totalSales}</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">+3 hoje</span>
            </div>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: '65%' }} />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold border-b border-outline-subtle/20 pb-4">Meus Designs</h2>
        {designs.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {designs.map(d => (
              <div key={d.id} className="group relative bg-white border border-outline-subtle/30 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all h-fit">
                <div className="aspect-square relative overflow-hidden bg-gray-50">
                  <img src={d.image} alt={d.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded-lg border border-outline-subtle text-[8px] font-black uppercase tracking-widest shadow-sm">
                    {d.style}
                  </div>
                </div>
                <div className="p-4 bg-white">
                  <p className="text-sm font-bold truncate">{d.title}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] text-gray-400">Vendas: {d.sales}</span>
                    <button className="text-primary hover:scale-110 transition-transform"><Download className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 border-2 border-dashed border-outline-subtle p-16 rounded-3xl flex flex-col items-center justify-center gap-4 text-center">
            <ImageIcon className="w-12 h-12 text-gray-300" />
            <div>
              <p className="font-bold text-gray-500">Nenhum design digitalizado ainda.</p>
              <button className="text-primary font-bold text-sm mt-2 hover:underline">Iniciar nova oficina</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const GalleryPage = ({ onRemix }: { onRemix: (d: Design) => void }) => {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'designs'), orderBy('sales', 'desc'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Design));
      setDesigns(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="flex flex-col gap-10 py-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Galeria Comunitária</h1>
          <p className="text-gray-500 mt-2">Designs que estão definindo a cultura artisan desta semana.</p>
        </div>
        <div className="flex gap-2">
           <span className="bg-primary/10 text-primary text-[10px] font-black px-4 py-2 rounded-full border border-primary/20 uppercase tracking-widest">🔥 Tendências</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
        {designs.map(d => (
          <motion.div 
            key={d.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative flex flex-col gap-4 cursor-pointer"
          >
            <div className="aspect-[4/5] rounded-[2rem] overflow-hidden bg-gray-100 border border-outline-subtle/20 shadow-lg relative group/item">
              <img src={d.image} alt={d.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-graphite/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4 backdrop-blur-sm">
                <button 
                  onClick={() => onRemix(d)}
                  className="bg-alabaster text-graphite px-8 py-3 rounded-2xl font-bold text-sm shadow-xl active:scale-95 transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-primary" /> Remix e Ganhe 20%
                </button>
                <div className="flex gap-2">
                   <button className="bg-white/20 p-3 rounded-full hover:bg-white/40 transition-colors"><Heart className="w-4 h-4 text-white" /></button>
                   <button className="bg-white/20 p-3 rounded-full hover:bg-white/40 transition-colors"><Maximize2 className="w-4 h-4 text-white" /></button>
                </div>
              </div>
              <div className="absolute top-4 right-4 bg-white px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-xl">
                 <ShoppingCart className="w-3 h-3 text-primary" />
                 <span className="text-[10px] font-bold">{d.sales} Vendas</span>
              </div>
            </div>
            <div className="px-2">
               <h3 className="font-bold text-lg">{d.title}</h3>
               <p className="text-[10px] font-medium text-gray-400 mt-1 uppercase tracking-widest">Artesão ID: #{d.ownerId.slice(-6)}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const CheckoutSidebar = ({ 
  isOpen, 
  onClose, 
  design,
  user,
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  design: Design | null,
  user: UserProfile | null,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState('M');
  const [fit, setFit] = useState('oversized');
  const [shareInGallery, setShareInGallery] = useState(true);

  if (!design) return null;

  const checkoutToStripe = async () => {
    try {
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: fit,
          size,
          quantity,
          color: design.color,
          imageBase64: design.image,
          style: design.style,
          customerEmail: user?.email ?? null,
          uid: user?.uid ?? null,
          shareInGallery,
        })
      });
      
      if (!response.ok) throw new Error('Failed to create session');
      
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error(error);
      alert('Erro ao iniciar pagamento. Tente novamente.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-graphite/40 backdrop-blur-sm"
          />
          <motion.aside 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-[101] w-full md:w-[480px] bg-white border-l border-outline-subtle shadow-2xl flex flex-col"
          >
            <header className="px-8 py-10 border-b border-outline-subtle/20 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-primary">Finalizar Design</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Série Artisan Limitada</p>
              </div>
              <button 
                onClick={onClose}
                className="p-3 rounded-full hover:bg-gray-100 transition-colors border border-outline-subtle/30"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-8 space-y-12">
              <div className="flex gap-6 items-center bg-gray-50 p-4 rounded-3xl border border-outline-subtle/20">
                <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-inner bg-white p-2">
                  <img src={design.image} className="w-full h-full object-contain" />
                </div>
                <div>
                   <h3 className="font-bold text-graphite">{design.title}</h3>
                   <p className="text-[10px] text-gray-500 mt-1">Algodão Premium Artisan 30.1</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Modelagem</h4>
                  <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-2xl">
                    <button 
                      onClick={() => setFit('regular')}
                      className={`py-3 rounded-xl font-bold text-xs transition-all ${fit === 'regular' ? 'bg-white text-graphite shadow-md' : 'text-gray-400'}`}
                    >
                      Padrão
                    </button>
                    <button 
                      onClick={() => setFit('oversized')}
                      className={`py-3 rounded-xl font-bold text-xs transition-all ${fit === 'oversized' ? 'bg-white text-graphite shadow-md' : 'text-gray-400'}`}
                    >
                      Oversized
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Escolha o Tamanho</h4>
                   <div className="flex flex-wrap gap-2">
                     {['P', 'M', 'G', 'GG'].map(s => (
                       <button 
                        key={s}
                        onClick={() => setSize(s)}
                        className={`min-w-14 h-14 rounded-2xl border-2 font-bold transition-all ${size === s ? 'border-primary bg-primary/5 text-primary' : 'border-outline-subtle bg-white hover:border-primary/50 text-gray-400'}`}
                       >
                         {s}
                       </button>
                     ))}
                   </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quantidade</h4>
                  <div className="inline-flex items-center gap-4 bg-gray-50 p-1.5 rounded-2xl border border-outline-subtle/20">
                    <button onClick={() => setQuantity(q => Math.max(1, q-1))} className="w-10 h-10 bg-white rounded-xl shadow flex items-center justify-center text-gray-400 hover:text-primary transition-all"><Minus className="w-4 h-4" /></button>
                    <span className="w-10 text-center font-bold text-xl">{quantity}</span>
                    <button onClick={() => setQuantity(q => q+1)} className="w-10 h-10 bg-white rounded-xl shadow flex items-center justify-center text-gray-400 hover:text-primary transition-all"><Plus className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="shareInGallery" 
                    checked={shareInGallery}
                    onChange={(e) => setShareInGallery(e.target.checked)}
                    className="w-5 h-5 accent-primary"
                  />
                  <label htmlFor="shareInGallery" className="text-xs font-bold text-gray-900">
                    Compartilhar meu design na Galeria Pública para acumular descontos
                  </label>
                </div>
              </div>
            </div>

            <footer className="p-8 border-t border-outline-subtle/30 bg-gray-50/50 space-y-6">
              <div className="flex justify-between items-end">
                <div>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subtotal Estimado</p>
                   <p className="text-[10px] text-gray-400 italic">Frete e Masterização inclusos</p>
                </div>
                <p className="text-4xl font-bold text-graphite tracking-tight">R$ {(149.90 * quantity).toFixed(2).replace('.', ',')}</p>
              </div>
              <button 
                onClick={checkoutToStripe}
                className="w-full py-5 rounded-3xl bg-primary text-white font-black uppercase tracking-widest shadow-2xl shadow-primary/30 hover:bg-primary-dark active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                <Check className="w-5 h-5" /> Ir para o Pagamento
              </button>
              <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-gray-400">
                <Check className="w-3 h-3 text-green-500" /> Transação Artisan Criptografada
              </div>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

// --- APP ROOT ---

export default function App() {
  const [page, setPage] = useState<Page>('workshop');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userDesigns, setUserDesigns] = useState<Design[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedDesignForCheckout, setSelectedDesignForCheckout] = useState<Design | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth Listener
  useEffect(() => {
    
    // Timeout de segurança: se o listener não responder em 10s, encerra o loading
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 10000);

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      clearTimeout(safetyTimeout);
      try {
        if (fbUser) {
          
          const userRef = doc(db, 'users', fbUser.uid);
          
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            const userData = { uid: fbUser.uid, ...userDoc.data() } as UserProfile;
            setUser(userData);
            setPage('dashboard');
          } else {
            // Initialize New User
            const newUser: UserProfile = {
              uid: fbUser.uid,
              name: fbUser.displayName || 'Artesão Anonimo',
              email: fbUser.email || '',
              avatar: fbUser.photoURL || 'https://ui-avatars.com/api/?name=' + fbUser.displayName,
              tokens: 20, // Welcome gift
              accumulatedDiscount: 0,
              totalSales: 0
            };
            await setDoc(doc(db, 'users', fbUser.uid), newUser);
            setUser(newUser);
            setPage('dashboard');
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("onAuthStateChanged Error:", err);
        handleFirestoreError(err, 'GET', `users/${fbUser?.uid || 'unknown'}`);
      } finally {
        setLoading(false);
      }
    });
    return () => {
      clearTimeout(safetyTimeout);
      unsubscribe();
    };
  }, []);


  // Fetch User Designs
  useEffect(() => {
    if (user) {
      setPage('dashboard');
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUserDesigns([]);
      return;
    }
    const q = query(collection(db, 'designs'), where('ownerId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Design));
      setUserDesigns(data);
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: unknown) {
      console.error("handleLogin: Login Error:", error);
      const code = (error as { code?: string })?.code;
      if (code === 'auth/unauthorized-domain') {
        alert('Domínio não autorizado no Firebase.\n\nAcesse o Firebase Console → Authentication → Settings → Authorized domains e adicione:\n\n' + window.location.hostname);
      }
    }
  };

  const handleLogout = () => signOut(auth);

  const handleDeductToken = async (): Promise<boolean> => {
    if (!user) return false;
    if (user.tokens <= 0) return false;

    const newTokens = user.tokens - 1;
    await updateDoc(doc(db, 'users', user.uid), { tokens: newTokens });
    setUser({ ...user, tokens: newTokens });
    return true;
  };

  const finalizeDesign = async (design: Design) => {
    if (!user) {
      setPage('login');
      return;
    }
    
    // Save design to Firestore if it's new
    if (design.id.startsWith('design_')) {
      const designRef = await addDoc(collection(db, 'designs'), {
        ...design,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      });
      design.id = designRef.id;
    }
    
    setSelectedDesignForCheckout(design);
    setIsCheckoutOpen(true);
  };

  const handleRemix = (parentDesign: Design) => {
    setPage('workshop');
    // Pre-fill concept or some logic could go here
    // For now we just reset the workshop with context
    alert(`Preparando Remix de: ${parentDesign.title}. Você ganhará créditos se outros replicarem sua nova versão!`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-alabaster flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
           <Sparkles className="w-12 h-12 text-primary animate-pulse" />
           <p className="text-xs font-bold text-primary uppercase tracking-[0.3em]">Calibrando Oficina...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-alabaster font-sans selection:bg-primary/20">
      <Header page={page} setPage={setPage} user={user} onLogin={handleLogin} onLogout={handleLogout} />
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-6">
        <AnimatePresence mode="wait">
          {page === 'workshop' ? (
            <motion.div 
              key="workshop" 
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <WorkshopPage 
                user={user} 
                onShowLogin={() => setPage('login')} 
                onFinalize={finalizeDesign}
                onDeductToken={handleDeductToken}
              />
            </motion.div>
          ) : page === 'gallery' ? (
            <motion.div 
              key="gallery" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
            >
              <GalleryPage onRemix={handleRemix} />
            </motion.div>
          ) : user ? (
            <motion.div 
              key="dashboard"                
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20 }}
            >
              <DashboardPage user={user} designs={userDesigns} />
            </motion.div>
          ) : ( // User is null, show login
             <div className="min-h-[70vh] flex flex-col items-center justify-center gap-8">
                <div className="text-center space-y-4">
                  <h2 className="text-5xl font-bold tracking-tighter text-graphite">Torne-se um <br/><span className="text-primary italic">Mestre Artesão</span></h2>
                  <p className="text-gray-500 max-w-md mx-auto">Crie designs exclusivos, compartilhe com a comunidade e ganhe créditos em cada venda inspirada em sua arte.</p>
                </div>
                <button 
                  onClick={handleLogin}
                  className="bg-graphite text-white px-10 py-5 rounded-3xl font-black uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
                >
                  Continuar com Google <ArrowRight className="w-5 h-5" />
                </button>
             </div>
          )}
        </AnimatePresence>
      </main>

      <footer className="bg-white border-t border-outline-subtle/20 w-full py-12 mt-20">
        <div className="max-w-7xl mx-auto px-10 flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="text-center md:text-left">
              <p className="text-2xl font-bold text-primary">AI T-Studio</p>
              <p className="text-[10px] uppercase font-black text-gray-400 mt-2 tracking-[0.4em]">Handcrafted Intelligence</p>
           </div>
           <nav className="flex gap-8 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <a href="#" className="hover:text-primary transition-colors">Sobre</a>
              <a href="#" className="hover:text-primary transition-colors">Termos</a>
              <a href="#" className="hover:text-primary transition-colors">Segurança</a>
              <a href="#" className="hover:text-primary transition-colors">Shopify Partner</a>
           </nav>
        </div>
      </footer>

      <CheckoutSidebar 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
        design={selectedDesignForCheckout}
        user={user}
      />
    </div>
  );
}
