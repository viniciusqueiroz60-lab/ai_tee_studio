import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, AlertCircle, Package, CheckCircle2, Clock,
  Truck, ShoppingBag, X, ChevronDown, ExternalLink, Cpu,
  LayoutGrid, List, Search, Filter
} from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { getApps, initializeApp } from 'firebase/app';
import firebaseConfig from '../firebase-applet-config.json';

function getFirebaseAuth() {
  const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  return getAuth(app);
}

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
  createdAt: string | null;
  completedAt: string | null;
  errorAt: string | null;
}

const KANBAN_COLUMNS: { key: string; label: string; color: string; bg: string; border: string; icon: any }[] = [
  { key: 'processing',         label: 'Processando',        color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200', icon: RefreshCw },
  { key: 'aguardando_producao',label: 'Aguard. Produção',   color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200', icon: Clock },
  { key: 'em_producao',        label: 'Em Produção',        color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: Package },
  { key: 'enviado',            label: 'Enviado',            color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', icon: Truck },
  { key: 'entregue',           label: 'Entregue',           color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200', icon: CheckCircle2 },
  { key: 'erro_processamento', label: 'Erro',               color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',   icon: AlertCircle },
];

const STATUS_MAP = Object.fromEntries(KANBAN_COLUMNS.map(c => [c.key, c]));

async function getAdminToken(): Promise<string | null> {
  const user = getFirebaseAuth().currentUser;
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

function StatusBadge({ status }: { status: string }) {
  const info = STATUS_MAP[status] ?? STATUS_MAP['processing'];
  const Icon = info.icon;
  const isSpinning = status === 'processing';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${info.bg} ${info.border} ${info.color}`}>
      <Icon className={`w-3 h-3 ${isSpinning ? 'animate-spin' : ''}`} />
      {info.label}
    </span>
  );
}

function OrderRow({ order, onStatusChange }: { order: AdminOrder; onStatusChange: (id: string, status: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr
        className="border-b border-outline-subtle/30 hover:bg-gray-50 cursor-pointer"
        onClick={() => setOpen(v => !v)}
      >
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
              {KANBAN_COLUMNS.map(c => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-700">{formatCurrency(order.amount, order.currency)}</td>
        <td className="px-4 py-3 text-xs text-gray-400">{formatDate(order.createdAt)}</td>
        <td className="px-4 py-3">
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </td>
      </tr>
      {open && (
        <tr className="bg-gray-50/70">
          <td colSpan={7} className="px-6 py-4">
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
                <span><b>Upscale:</b> {order.upscaled ? 'Sim' : 'Não'}</span>
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

function ReplicatePanel() {
  const [data, setData] = useState<{ account: any; predictions: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getAdminToken();
      if (!token) { setError('Sem token'); setLoading(false); return; }
      try {
        const res = await fetch('/api/admin/replicate/account', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setData(await res.json());
      } catch (e) {
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
      <div className="bg-white border border-outline-subtle rounded-3xl p-6">
        <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2"><Cpu className="w-5 h-5 text-primary" /> Conta Replicate</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Usuário', value: account.username },
            { label: 'Nome', value: account.name ?? '—' },
            { label: 'Tipo', value: account.type ?? '—' },
            { label: 'GitHub', value: account.github_url ? (
              <a href={account.github_url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                Ver <ExternalLink className="w-3 h-3" />
              </a>
            ) : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">{label}</p>
              <p className="text-sm font-bold text-gray-800">{value as any}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-outline-subtle rounded-3xl p-6">
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
                {predictions.map((p: any) => {
                  const durationSec = p.metrics?.predict_time ? `${p.metrics.predict_time.toFixed(1)}s` : '—';
                  const colorClass = statusColors[p.status] ?? 'text-gray-600 bg-gray-100';
                  return (
                    <tr key={p.id} className="border-b border-outline-subtle/30">
                      <td className="py-2 pr-4 font-mono text-xs text-gray-400">{p.id?.slice(0, 8)}</td>
                      <td className="py-2 pr-4 text-xs text-gray-600 max-w-[200px] truncate">{p.model ?? p.version?.slice(0, 16) ?? '—'}</td>
                      <td className="py-2 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${colorClass}`}>{p.status}</span>
                      </td>
                      <td className="py-2 pr-4 text-xs text-gray-500">{durationSec}</td>
                      <td className="py-2 text-xs text-gray-400">{formatDate(p.created_at)}</td>
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

interface AdminPageProps {
  userUid: string;
}

export default function AdminPage({ userUid: _userUid }: AdminPageProps) {
  const [tab, setTab] = useState<'all' | 'errors' | 'replicate' | 'kanban'>('all');
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = await getAdminToken();
    if (!token) { setError('Sem sessão'); setLoading(false); return; }
    try {
      const res = await fetch('/api/admin/forders', { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 403) { setAccessDenied(true); setLoading(false); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch (e) {
      setError('Falha ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const updateStatus = async (id: string, status: string) => {
    const token = await getAdminToken();
    if (!token) return;
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    try {
      await fetch(`/api/admin/forders/${id}/status`, {
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
        <p className="text-xs text-gray-400">Para liberar acesso, crie o documento <code>admins/{'{seu-uid}'}</code> no Firestore ou defina a variável <code>ADMIN_UIDS</code>.</p>
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

  const TABS = [
    { key: 'all',      label: 'Todos os Pedidos', icon: List },
    { key: 'errors',   label: `Erros (${errorOrders.length})`, icon: AlertCircle },
    { key: 'replicate',label: 'Replicate',        icon: Cpu },
    { key: 'kanban',   label: 'Kanban',            icon: LayoutGrid },
  ] as const;

  return (
    <div className="py-10 flex flex-col gap-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Painel Admin</h1>
          <p className="text-gray-500 mt-1">Gestão de pedidos, erros e produção.</p>
        </div>
        <button
          onClick={loadOrders}
          className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-dark"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total de pedidos', value: orders.length, icon: ShoppingBag, color: 'text-primary' },
          { label: 'Em processamento', value: orders.filter(o => o.status === 'processing').length, icon: RefreshCw, color: 'text-blue-600' },
          { label: 'Aguard. produção', value: orders.filter(o => o.status === 'aguardando_producao').length, icon: Clock, color: 'text-amber-600' },
          { label: 'Erros', value: errorOrders.length, icon: AlertCircle, color: 'text-red-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-outline-subtle rounded-2xl p-5">
            <Icon className={`w-5 h-5 mb-2 ${color}`} />
            <p className="text-2xl font-black text-gray-900">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Receita */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl px-6 py-4 flex items-center gap-4">
        <ShoppingBag className="w-8 h-8 text-primary" />
        <div>
          <p className="text-xs text-primary font-bold uppercase tracking-widest">Receita Total Registrada</p>
          <p className="text-3xl font-black text-primary">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue / 100)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl self-start">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              tab === key ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && <div className="flex justify-center py-16"><RefreshCw className="w-8 h-8 text-primary animate-spin" /></div>}
      {!loading && error && <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-800">{error}</div>}

      {/* All Orders Tab */}
      {!loading && tab === 'all' && (
        <div className="bg-white border border-outline-subtle rounded-3xl overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-outline-subtle/50">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por e-mail, ID, estilo…"
              className="flex-1 text-sm outline-none placeholder:text-gray-300"
            />
            {search && <button onClick={() => setSearch('')}><X className="w-4 h-4 text-gray-400" /></button>}
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
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(order => (
                    <OrderRow key={order.id} order={order} onStatusChange={updateStatus} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Errors Tab */}
      {!loading && tab === 'errors' && (
        <div className="flex flex-col gap-4">
          {errorOrders.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-3xl p-12 flex flex-col items-center gap-3">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
              <p className="font-bold text-green-800">Nenhum erro de processamento.</p>
            </div>
          ) : (
            errorOrders.map(order => (
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
                    {KANBAN_COLUMNS.map(c => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Replicate Tab */}
      {!loading && tab === 'replicate' && <ReplicatePanel />}

      {/* Kanban Tab */}
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
                  className={`w-64 flex flex-col rounded-2xl border-2 transition-colors ${
                    isOver ? 'border-primary bg-primary/5' : `${col.border} ${col.bg}`
                  }`}
                  onDragOver={e => { e.preventDefault(); setDragOverCol(col.key); }}
                  onDragLeave={() => setDragOverCol(null)}
                  onDrop={e => handleDrop(e, col.key)}
                >
                  <div className={`flex items-center justify-between px-4 py-3 border-b ${col.border}`}>
                    <div className={`flex items-center gap-2 font-bold text-sm ${col.color}`}>
                      <Icon className="w-4 h-4" />
                      {col.label}
                    </div>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${col.bg} ${col.color} border ${col.border}`}>
                      {colOrders.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 p-3 min-h-[120px]">
                    {colOrders.length === 0 && (
                      <p className="text-center text-xs text-gray-300 py-6">Arraste pedidos aqui</p>
                    )}
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
    </div>
  );
}
