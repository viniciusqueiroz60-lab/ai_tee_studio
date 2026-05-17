import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, AlertCircle, Package, CheckCircle2, Clock,
  Truck, ShoppingBag, X, ChevronDown, ExternalLink, Cpu,
  LayoutGrid, List, Search, Store, Copy, RotateCcw, Plus,
  Trash2, ToggleLeft, ToggleRight, Eye, EyeOff, LogOut, LogIn,
  DollarSign, Sparkles
} from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, type User } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const api = (path: string) => `/api${path}`;

async function getToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

function formatCurrency(amount: number | null, currency: string | null) {
  if (!amount) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: (currency ?? 'brl').toUpperCase(),
  }).format(amount / 100);
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

// --- API cost constants (approximate BRL) ---
const AI_API_COST_BRL = 0.15; // Gemini + Replicate per order
const PRODUCTION_COST_BRL: Record<string, number> = {
  P: 15.0, S: 15.0,
  M: 17.0,
  G: 17.0, L: 17.0,
  GG: 20.0, XL: 20.0,
};
const DEFAULT_PRODUCTION_COST = 17.0;

function getProductionCost(size: string | null): number {
  if (!size) return DEFAULT_PRODUCTION_COST;
  return PRODUCTION_COST_BRL[size.toUpperCase()] ?? DEFAULT_PRODUCTION_COST;
}

// --- Interfaces ---
interface AdminOrder {
  id: string;
  status: string;
  sessionId: string | null;
  uid: string | null;
  customerEmail: string | null;
  style: string | null;
  model: string | null;
  size: string | null;
  color: string | null;
  quantity: number;
  amount: number | null;
  currency: string | null;
  artworkUrl: string | null;
  artworkFilename: string | null;
  upscaled: boolean;
  aiSkipped: boolean;
  storeId: string | null;
  createdAt: string | null;
  completedAt: string | null;
  errorAt: string | null;
}

interface StoreDoc {
  id: string;
  name: string;
  platform: string;
  apiKey: string;
  active: boolean;
  isAiEnabled: boolean;
  ownerUid: string | null;
  webhookUrl: string | null;
  createdAt: string;
}

// --- Kanban config ---
const KANBAN_COLUMNS: { key: string; label: string; color: string; bg: string; border: string; icon: React.ElementType }[] = [
  { key: 'processing',         label: 'Processando',       color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200', icon: RefreshCw },
  { key: 'aguardando_producao',label: 'Aguard. Produção',  color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200', icon: Clock },
  { key: 'em_producao',        label: 'Em Produção',       color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: Package },
  { key: 'enviado',            label: 'Enviado',           color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', icon: Truck },
  { key: 'entregue',           label: 'Entregue',          color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200', icon: CheckCircle2 },
  { key: 'erro_processamento', label: 'Erro',              color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',   icon: AlertCircle },
];

const STATUS_MAP = Object.fromEntries(KANBAN_COLUMNS.map(c => [c.key, c]));

// --- Shared components ---
function StatusBadge({ status }: { status: string }) {
  const info = STATUS_MAP[status] ?? STATUS_MAP['processing'];
  const Icon = info.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${info.bg} ${info.border} ${info.color}`}>
      <Icon className={`w-3 h-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {info.label}
    </span>
  );
}

function AiBadge({ isAiEnabled }: { isAiEnabled: boolean }) {
  return isAiEnabled ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-violet-100 text-violet-700 border border-violet-200">
      <Sparkles className="w-3 h-3" /> IA Ativa
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
      <Store className="w-3 h-3" /> Catálogo
    </span>
  );
}

// --- Orders table row ---
function OrderRow({
  order,
  storeIsAi,
  onStatusChange,
}: {
  order: AdminOrder;
  storeIsAi: boolean;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="border-b border-outline-subtle/30 hover:bg-gray-50 cursor-pointer" onClick={() => setOpen(v => !v)}>
        <td className="px-4 py-3 text-xs text-gray-400 font-mono">{order.id.slice(0, 8)}</td>
        <td className="px-4 py-3 text-sm text-gray-700 max-w-[160px] truncate">{order.customerEmail ?? '—'}</td>
        <td className="px-4 py-3 text-sm text-gray-700">{order.style ?? '—'}</td>
        <td className="px-4 py-3">
          <div onClick={e => e.stopPropagation()}>
            <select
              value={order.status}
              onChange={e => onStatusChange(order.id, e.target.value)}
              className="text-xs border border-outline-subtle rounded-lg px-2 py-1 bg-white focus:outline-none"
            >
              {KANBAN_COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-700">{formatCurrency(order.amount, order.currency)}</td>
        <td className="px-4 py-3 text-xs text-gray-400">
          {order.storeId ? (
            <span className="px-2 py-0.5 bg-gray-100 rounded-full text-gray-500 font-mono">{order.storeId}</span>
          ) : '—'}
        </td>
        <td className="px-4 py-3 text-xs text-gray-400">{formatDate(order.createdAt)}</td>
        <td className="px-4 py-3">
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </td>
      </tr>
      {open && (
        <tr className="bg-gray-50/70">
          <td colSpan={8} className="px-6 py-4">
            <div className="flex gap-6 flex-wrap">
              {order.artworkUrl && (
                <img src={order.artworkUrl} alt="arte" className="w-24 h-24 object-contain rounded-xl border border-outline-subtle" />
              )}
              <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2 text-xs text-gray-600">
                <span><b>UID:</b> {order.uid ?? '—'}</span>
                <span><b>Session:</b> <span className="font-mono">{order.sessionId?.slice(-12) ?? '—'}</span></span>
                <span><b>Modelo:</b> {order.model ?? '—'}</span>
                <span><b>Cor:</b> {order.color ?? '—'}</span>
                <span><b>Tam:</b> {order.size ?? '—'}</span>
                <span><b>Qtd:</b> {order.quantity}</span>
                {/* Only show upscale info for AI-enabled stores */}
                {storeIsAi && (
                  <span><b>Upscale:</b> {order.upscaled ? 'Sim' : 'Não'}</span>
                )}
                <span><b>Concluído:</b> {formatDate(order.completedAt)}</span>
                {order.errorAt && <span className="text-red-600"><b>Erro em:</b> {formatDate(order.errorAt)}</span>}
                {order.artworkFilename && <span className="col-span-2 font-mono break-all">{order.artworkFilename}</span>}
              </div>
              {order.artworkUrl && (
                <a href={order.artworkUrl} target="_blank" rel="noopener noreferrer"
                  className="self-start text-xs text-primary font-bold flex items-center gap-1 hover:underline">
                  <ExternalLink className="w-3 h-3" /> Abrir arte
                </a>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// --- Kanban card ---
function KanbanCard({ order, onDragStart }: { order: AdminOrder; onDragStart: (e: React.DragEvent, id: string) => void }) {
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, order.id)}
      className="bg-white border border-outline-subtle rounded-xl p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-2 mb-2">
        {order.artworkUrl ? (
          <img src={order.artworkUrl} alt="" className="w-10 h-10 rounded-lg object-contain border border-outline-subtle/50 flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
            <RefreshCw className="w-4 h-4 text-gray-300 animate-spin" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-bold text-gray-800 truncate">{order.style ?? 'Camiseta'}</p>
          <p className="text-[10px] text-gray-400 truncate">{order.customerEmail ?? '—'}</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] text-gray-400">
        <span>{formatDate(order.createdAt)}</span>
        <span className="font-bold text-gray-600">{formatCurrency(order.amount, order.currency)}</span>
      </div>
    </div>
  );
}

// --- Replicate tab ---
function ReplicatePanel() {
  const [data, setData] = useState<{ account: Record<string, unknown>; predictions: Record<string, unknown>[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) { setError('Sem token'); setLoading(false); return; }
      try {
        const res = await fetch(api('/admin/replicate/account'), { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setData(await res.json());
      } catch {
        setError('Falha ao carregar dados do Replicate');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="w-8 h-8 text-primary animate-spin" /></div>;
  if (error || !data) return <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800">{error}</div>;

  const { account, predictions } = data;
  const statusColors: Record<string, string> = {
    succeeded: 'text-green-700 bg-green-50',
    failed: 'text-red-700 bg-red-50',
    processing: 'text-blue-700 bg-blue-50',
    starting: 'text-yellow-700 bg-yellow-50',
    canceled: 'text-gray-500 bg-gray-100',
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white border border-outline-subtle rounded-2xl p-6">
        <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2"><Cpu className="w-5 h-5 text-primary" /> Conta Replicate</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Usuário', value: String(account.username ?? '—') },
            { label: 'Nome', value: String(account.name ?? '—') },
            { label: 'Tipo', value: String(account.type ?? '—') },
            { label: 'GitHub', value: account.github_url as string | null },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">{label}</p>
              {label === 'GitHub' && value ? (
                <a href={value} target="_blank" rel="noreferrer" className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
                  Ver <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <p className="text-sm font-bold text-gray-800">{value ?? '—'}</p>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white border border-outline-subtle rounded-2xl p-6">
        <h3 className="font-black text-gray-900 mb-4">Últimas Predições</h3>
        {predictions.length === 0 ? (
          <p className="text-gray-400 text-sm">Nenhuma predição encontrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold text-gray-400 uppercase border-b border-outline-subtle">
                  <th className="pb-3 pr-4">ID</th>
                  <th className="pb-3 pr-4">Modelo</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Duração</th>
                  <th className="pb-3">Criado</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((p) => {
                  const metrics = p.metrics as Record<string, number> | undefined;
                  const durationSec = metrics?.predict_time ? `${metrics.predict_time.toFixed(1)}s` : '—';
                  const colorClass = statusColors[String(p.status)] ?? 'text-gray-600 bg-gray-100';
                  return (
                    <tr key={String(p.id)} className="border-b border-outline-subtle/30">
                      <td className="py-2 pr-4 font-mono text-xs text-gray-400">{String(p.id ?? '').slice(0, 8)}</td>
                      <td className="py-2 pr-4 text-xs text-gray-600 max-w-[200px] truncate">{String(p.model ?? (p.version ? String(p.version).slice(0, 16) : '—'))}</td>
                      <td className="py-2 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${colorClass}`}>{String(p.status)}</span>
                      </td>
                      <td className="py-2 pr-4 text-xs text-gray-500">{durationSec}</td>
                      <td className="py-2 text-xs text-gray-400">{formatDate(String(p.created_at ?? ''))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Financeiro (COGS) tab ---
function FinanceiroPanel({ orders, storeMap }: { orders: AdminOrder[]; storeMap: Map<string, StoreDoc> }) {
  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const rows = orders.map(o => {
    const store = storeMap.get(o.storeId ?? '');
    const isAi = store ? store.isAiEnabled : !o.aiSkipped;
    const prodCost = getProductionCost(o.size) * (o.quantity || 1);
    const apiCost = isAi ? AI_API_COST_BRL : 0;
    const totalCogs = prodCost + apiCost;
    const revenue = (o.amount ?? 0) / 100;
    const margin = revenue - totalCogs;
    return { order: o, store, isAi, prodCost, apiCost, totalCogs, revenue, margin };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      revenue: acc.revenue + r.revenue,
      prodCost: acc.prodCost + r.prodCost,
      apiCost: acc.apiCost + r.apiCost,
      totalCogs: acc.totalCogs + r.totalCogs,
      margin: acc.margin + r.margin,
    }),
    { revenue: 0, prodCost: 0, apiCost: 0, totalCogs: 0, margin: 0 }
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Receita Total', value: fmt(totals.revenue), color: 'text-primary' },
          { label: 'COGS Total', value: fmt(totals.totalCogs), color: 'text-amber-600' },
          { label: 'Margem Total', value: fmt(totals.margin), color: totals.margin >= 0 ? 'text-green-600' : 'text-red-600' },
          { label: 'Custo API (IA)', value: fmt(totals.apiCost), color: 'text-violet-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-outline-subtle rounded-2xl p-4">
            <DollarSign className={`w-4 h-4 mb-2 ${color}`} />
            <p className={`text-xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-outline-subtle rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-outline-subtle/50 bg-gray-50/50">
          <h3 className="font-black text-gray-900 text-sm">Detalhamento por Pedido</h3>
          <p className="text-xs text-gray-400 mt-0.5">Custo de API: {fmt(AI_API_COST_BRL)} (Gemini + Replicate) para lojas IA · R$ 0,00 para lojas catálogo</p>
        </div>
        {rows.length === 0 ? (
          <p className="text-gray-400 text-center py-12">Nenhum pedido encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-outline-subtle/50">
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Loja</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Receita</th>
                  <th className="px-4 py-3">Prod.</th>
                  <th className="px-4 py-3">API</th>
                  <th className="px-4 py-3">COGS</th>
                  <th className="px-4 py-3">Margem</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ order, store, isAi, prodCost, apiCost, totalCogs, revenue, margin }) => (
                  <tr key={order.id} className="border-b border-outline-subtle/30 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{order.id.slice(0, 8)}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{store?.name ?? order.storeId ?? '—'}</td>
                    <td className="px-4 py-2.5"><AiBadge isAiEnabled={isAi} /></td>
                    <td className="px-4 py-2.5 text-xs font-bold text-gray-800">{fmt(revenue)}</td>
                    <td className="px-4 py-2.5 text-xs text-amber-700">{fmt(prodCost)}</td>
                    <td className="px-4 py-2.5 text-xs text-violet-600">{fmt(apiCost)}</td>
                    <td className="px-4 py-2.5 text-xs font-bold text-gray-700">{fmt(totalCogs)}</td>
                    <td className={`px-4 py-2.5 text-xs font-bold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {fmt(margin)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-outline-subtle font-black text-sm">
                  <td colSpan={3} className="px-4 py-3 text-gray-500 text-xs">TOTAL ({rows.length} pedidos)</td>
                  <td className="px-4 py-3 text-gray-800">{fmt(totals.revenue)}</td>
                  <td className="px-4 py-3 text-amber-700">{fmt(totals.prodCost)}</td>
                  <td className="px-4 py-3 text-violet-600">{fmt(totals.apiCost)}</td>
                  <td className="px-4 py-3 text-gray-700">{fmt(totals.totalCogs)}</td>
                  <td className={`px-4 py-3 ${totals.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(totals.margin)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Stores tab ---
function LojasBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
      {active ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
      {active ? 'Ativa' : 'Inativa'}
    </span>
  );
}

function LojasPanel() {
  const [stores, setStores] = useState<StoreDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPlatform, setNewPlatform] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [rotating, setRotating] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    if (!token) { setError('Sem token'); setLoading(false); return; }
    try {
      const res = await fetch(api('/admin/stores'), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStores(data.stores ?? []);
    } catch {
      setError('Falha ao carregar lojas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleVisible = (id: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const copyKey = async (id: string, key: string) => {
    await navigator.clipboard.writeText(key);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleActive = async (store: StoreDoc) => {
    const token = await getToken();
    if (!token) return;
    await fetch(api(`/admin/stores/${store.id}`), {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !store.active }),
    });
    setStores(prev => prev.map(s => s.id === store.id ? { ...s, active: !s.active } : s));
  };

  const rotateKey = async (storeId: string) => {
    const token = await getToken();
    if (!token) return;
    setRotating(storeId);
    try {
      const res = await fetch(api(`/admin/stores/${storeId}/rotate-key`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStores(prev => prev.map(s => s.id === storeId ? { ...s, apiKey: data.apiKey } : s));
    } finally {
      setRotating(null);
    }
  };

  const deleteStore = async (storeId: string) => {
    if (!confirm('Desativar esta loja? Ela ficará inativa e seus dados serão preservados.')) return;
    const token = await getToken();
    if (!token) return;
    await fetch(api(`/admin/stores/${storeId}`), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setStores(prev => prev.map(s => s.id === storeId ? { ...s, active: false } : s));
  };

  const createStore = async () => {
    if (!newName || !newPlatform) return;
    setCreating(true);
    const token = await getToken();
    if (!token) { setCreating(false); return; }
    try {
      const res = await fetch(api('/admin/stores'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, platform: newPlatform, webhookUrl: newWebhookUrl || undefined }),
      });
      const data = await res.json();
      setStores(prev => [...prev, data]);
      setShowModal(false);
      setNewName('');
      setNewPlatform('');
      setNewWebhookUrl('');
    } finally {
      setCreating(false);
    }
  };

  const ingestUrl = (storeId: string) => {
    const origin = window.location.origin;
    return `${origin}/api/ingest/${storeId}/orders`;
  };

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="w-8 h-8 text-primary animate-spin" /></div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800">{error}</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-gray-900">Lojas Registradas</h2>
          <p className="text-xs text-gray-400 mt-1">Gerencie lojas externas e suas chaves de API para ingestão de pedidos.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-primary-dark transition-all"
        >
          <Plus className="w-4 h-4" /> Nova Loja
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {stores.map(store => (
          <div key={store.id} className="bg-white border border-outline-subtle rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Store className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-gray-900">{store.name}</h3>
                    <LojasBadge active={store.active} />
                    <AiBadge isAiEnabled={store.isAiEnabled} />
                    {store.id === 'tshirt-store' && (
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">padrão</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">{store.id} · {store.platform}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(store)}
                  title={store.active ? 'Desativar' : 'Ativar'}
                  className={`p-2 rounded-lg transition-colors ${store.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                >
                  {store.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                {store.id !== 'tshirt-store' && (
                  <button
                    onClick={() => deleteStore(store.id)}
                    title="Deletar loja"
                    className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1">Chave de API</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-gray-50 border border-outline-subtle rounded-lg px-3 py-2 font-mono text-gray-700 overflow-hidden text-ellipsis whitespace-nowrap">
                    {visibleKeys.has(store.id) ? store.apiKey : store.apiKey.slice(0, 10) + '••••••••••••••••'}
                  </code>
                  <button onClick={() => toggleVisible(store.id)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400">
                    {visibleKeys.has(store.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={() => copyKey(store.id, store.apiKey)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400">
                    {copied === store.id ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => rotateKey(store.id)}
                    disabled={rotating === store.id}
                    title="Rotacionar chave"
                    className="p-2 hover:bg-amber-50 rounded-lg transition-colors text-amber-500 disabled:opacity-50"
                  >
                    <RotateCcw className={`w-4 h-4 ${rotating === store.id ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1">URL de Ingestão</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-gray-50 border border-outline-subtle rounded-lg px-3 py-2 font-mono text-gray-600 overflow-hidden text-ellipsis whitespace-nowrap">
                    POST {ingestUrl(store.id)}
                  </code>
                  <button onClick={() => copyKey(`ingest_${store.id}`, ingestUrl(store.id))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400">
                    {copied === `ingest_${store.id}` ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Header: <code className="font-mono bg-gray-100 px-1 rounded">x-api-key: &lt;chave&gt;</code></p>
              </div>

              {store.webhookUrl && (
                <div>
                  <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1">Webhook de Retorno</p>
                  <code className="text-xs bg-gray-50 border border-outline-subtle rounded-lg px-3 py-2 font-mono text-gray-600 block">{store.webhookUrl}</code>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black text-gray-900">Nova Loja</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Nome da Loja *</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Minha Loja"
                  className="w-full border border-outline-subtle rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Plataforma *</label>
                <select
                  value={newPlatform}
                  onChange={e => setNewPlatform(e.target.value)}
                  className="w-full border border-outline-subtle rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                >
                  <option value="">Selecionar…</option>
                  <option value="custom">Custom</option>
                  <option value="shopify">Shopify</option>
                  <option value="woocommerce">WooCommerce</option>
                  <option value="nuvemshop">NuvemShop</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">URL de Webhook (opcional)</label>
                <input
                  value={newWebhookUrl}
                  onChange={e => setNewWebhookUrl(e.target.value)}
                  placeholder="https://minha-loja.com/webhook"
                  className="w-full border border-outline-subtle rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <p className="text-[11px] text-gray-400">Novas lojas são criadas como <b>Catálogo</b> (sem IA). Para habilitar IA, altere o campo <code className="bg-gray-100 px-1 rounded">isAiEnabled</code> via API.</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-outline-subtle text-sm font-bold py-2 rounded-xl hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={createStore}
                disabled={!newName || !newPlatform || creating}
                className="flex-1 bg-primary text-white text-sm font-bold py-2 rounded-xl hover:bg-primary-dark transition-all disabled:opacity-50"
              >
                {creating ? 'Criando…' : 'Criar Loja'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main AdminPanel ---
type Tab = 'all' | 'errors' | 'replicate' | 'kanban' | 'stores' | 'financeiro';

function AdminPanel({ user }: { user: User }) {
  const [tab, setTab] = useState<Tab>('all');
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [allStores, setAllStores] = useState<StoreDoc[]>([]);

  // Build a map of storeId → StoreDoc for O(1) lookups
  const storeMap = new Map<string, StoreDoc>(allStores.map(s => [s.id, s]));

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      try {
        const res = await fetch(api('/admin/stores'), { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setAllStores(data.stores ?? []);
        }
      } catch { /* non-fatal — selector will be hidden */ }
    })();
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = await getToken();
    if (!token) { setError('Sem sessão'); setLoading(false); return; }
    try {
      const params = new URLSearchParams();
      if (storeFilter && storeFilter !== 'all') params.set('storeId', storeFilter);
      const url = api(`/admin/forders${params.toString() ? '?' + params.toString() : ''}`);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 403) { setAccessDenied(true); setLoading(false); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch {
      setError('Falha ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  }, [storeFilter]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const updateStatus = async (id: string, status: string) => {
    const token = await getToken();
    if (!token) return;
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    try {
      await fetch(api(`/admin/forders/${id}/status`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch {
      loadOrders();
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('orderId', id);
  };

  const handleDrop = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('orderId');
    if (id) updateStatus(id, colKey);
    setDragOverCol(null);
  };

  if (accessDenied) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-16 h-16 text-red-400" />
        <h2 className="text-2xl font-bold text-gray-800">Acesso Restrito</h2>
        <p className="text-gray-500">Você não tem permissão de administrador.</p>
        <p className="text-xs text-gray-400 text-center max-w-md">Para liberar acesso, defina a variável <code className="bg-gray-100 px-1 rounded">ADMIN_UIDS</code> com seu UID <code className="bg-gray-100 px-1 rounded font-mono">{user.uid}</code> ou crie o documento <code className="bg-gray-100 px-1 rounded">admins/{user.uid}</code> no Firestore.</p>
      </div>
    );
  }

  const filteredOrders = orders.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.customerEmail?.toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q) ||
      o.style?.toLowerCase().includes(q) ||
      o.sessionId?.toLowerCase().includes(q)
    );
  });

  const errorOrders = orders.filter(o => o.status === 'erro_processamento');
  const totalRevenue = orders.reduce((s, o) => s + (o.amount ?? 0), 0);

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'all',         label: 'Pedidos',                           icon: List },
    { key: 'errors',      label: `Erros (${errorOrders.length})`,     icon: AlertCircle },
    { key: 'replicate',   label: 'Replicate',                         icon: Cpu },
    { key: 'kanban',      label: 'Kanban',                            icon: LayoutGrid },
    { key: 'stores',      label: 'Lojas',                             icon: Store },
    { key: 'financeiro',  label: 'Financeiro',                        icon: DollarSign },
  ];

  return (
    <div className="py-8 flex flex-col gap-8">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">AI T-Studio</p>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Painel Admin</h1>
          <p className="text-gray-400 mt-1 text-sm flex items-center gap-2">
            {user.photoURL && <img src={user.photoURL} alt="" className="w-5 h-5 rounded-full" />}
            {user.displayName ?? user.email}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadOrders} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-primary transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button onClick={() => signOut(auth)} className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-red-500 transition-colors">
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </div>

      {tab !== 'stores' && tab !== 'financeiro' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Total', value: orders.length, icon: ShoppingBag, color: 'text-primary' },
              { label: 'Processando', value: orders.filter(o => o.status === 'processing').length, icon: RefreshCw, color: 'text-blue-600' },
              { label: 'Aguard. Produção', value: orders.filter(o => o.status === 'aguardando_producao').length, icon: Clock, color: 'text-amber-600' },
              { label: 'Entregues', value: orders.filter(o => o.status === 'entregue').length, icon: CheckCircle2, color: 'text-green-600' },
              { label: 'Erros', value: errorOrders.length, icon: AlertCircle, color: 'text-red-600' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white border border-outline-subtle rounded-2xl p-4">
                <Icon className={`w-4 h-4 mb-2 ${color}`} />
                <p className="text-2xl font-black text-gray-900">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl px-6 py-4 flex items-center gap-4">
            <ShoppingBag className="w-7 h-7 text-primary" />
            <div>
              <p className="text-xs text-primary font-bold uppercase tracking-widest">Receita Total</p>
              <p className="text-2xl font-black text-primary">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue / 100)}
              </p>
            </div>
          </div>
        </>
      )}

      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl self-start overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${tab === key ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-16"><RefreshCw className="w-8 h-8 text-primary animate-spin" /></div>}
      {!loading && error && <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-800">{error}</div>}

      {!loading && tab === 'all' && (
        <div className="bg-white border border-outline-subtle rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-outline-subtle/50 flex-wrap">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por e-mail, ID, estilo…"
              className="flex-1 min-w-[120px] text-sm outline-none placeholder:text-gray-300"
            />
            {search && <button onClick={() => setSearch('')}><X className="w-4 h-4 text-gray-400" /></button>}
            {allStores.length > 0 && (
              <select
                value={storeFilter}
                onChange={e => setStoreFilter(e.target.value)}
                className="text-xs border border-outline-subtle rounded-lg px-2 py-1 bg-white focus:outline-none"
              >
                <option value="all">Todas as lojas</option>
                {allStores.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
              </select>
            )}
            <span className="text-xs text-gray-400 font-bold">{filteredOrders.length} pedidos</span>
          </div>
          {filteredOrders.length === 0 ? (
            <p className="text-gray-400 text-center py-12">Nenhum pedido encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-outline-subtle/50 bg-gray-50/50">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">E-mail</th>
                    <th className="px-4 py-3">Estilo</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Loja</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(order => {
                    const store = storeMap.get(order.storeId ?? '');
                    const storeIsAi = store ? store.isAiEnabled : !order.aiSkipped;
                    return (
                      <OrderRow
                        key={order.id}
                        order={order}
                        storeIsAi={storeIsAi}
                        onStatusChange={updateStatus}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!loading && tab === 'errors' && (
        <div className="flex flex-col gap-4">
          {errorOrders.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-12 flex flex-col items-center gap-3">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
              <p className="font-bold text-green-800">Nenhum erro de processamento.</p>
            </div>
          ) : errorOrders.map(order => (
            <div key={order.id} className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="font-bold text-red-900 text-sm">Erro no pedido #{order.id.slice(0, 8)}</span>
                  </div>
                  <p className="text-xs text-red-700">
                    <b>Cliente:</b> {order.customerEmail ?? '—'} ·{' '}
                    <b>Estilo:</b> {order.style ?? '—'} ·{' '}
                    <b>Erro em:</b> {formatDate(order.errorAt)} ·{' '}
                    <b>Criado:</b> {formatDate(order.createdAt)}
                  </p>
                  <p className="text-xs text-red-600 font-mono mt-1">{order.sessionId}</p>
                </div>
                <select
                  value={order.status}
                  onChange={e => updateStatus(order.id, e.target.value)}
                  className="text-xs border border-red-300 rounded-lg px-2 py-1 bg-white focus:outline-none"
                >
                  {KANBAN_COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === 'replicate' && <ReplicatePanel />}

      {!loading && tab === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {KANBAN_COLUMNS.map(col => {
              const colOrders = orders.filter(o => o.status === col.key);
              const Icon = col.icon;
              const isOver = dragOverCol === col.key;
              return (
                <div
                  key={col.key}
                  className={`w-64 flex flex-col rounded-2xl border-2 transition-colors ${isOver ? 'border-primary bg-primary/5' : `${col.border} ${col.bg}`}`}
                  onDragOver={e => { e.preventDefault(); setDragOverCol(col.key); }}
                  onDragLeave={() => setDragOverCol(null)}
                  onDrop={e => handleDrop(e, col.key)}
                >
                  <div className={`flex items-center justify-between px-4 py-3 border-b ${col.border}`}>
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${col.color}`} />
                      <span className={`text-sm font-black ${col.color}`}>{col.label}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.bg} ${col.color} border ${col.border}`}>
                      {colOrders.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 p-3 min-h-[80px]">
                    {colOrders.map(order => (
                      <KanbanCard key={order.id} order={order} onDragStart={handleDragStart} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'stores' && <LojasPanel />}

      {!loading && tab === 'financeiro' && (
        <FinanceiroPanel orders={orders} storeMap={storeMap} />
      )}
    </div>
  );
}

// --- Login screen ---
function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') {
        setError('Popup bloqueado. Permita popups e tente novamente.');
      } else {
        setError('Erro no login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6 px-4">
      <div className="text-center">
        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">AI T-Studio</p>
        <h1 className="text-3xl font-black text-gray-900">Admin Hub</h1>
        <p className="text-gray-400 text-sm mt-2">Acesso restrito a administradores autorizados.</p>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 max-w-sm text-center">
          {error}
        </div>
      )}
      <button
        onClick={handleLogin}
        disabled={loading}
        className="flex items-center gap-3 bg-graphite text-white font-bold px-8 py-4 rounded-2xl hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-60"
      >
        <LogIn className="w-5 h-5" />
        {loading ? 'Entrando…' : 'Entrar com Google'}
      </button>
    </div>
  );
}

// --- Root ---
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdminPanel user={user} />
      </div>
    </div>
  );
}
