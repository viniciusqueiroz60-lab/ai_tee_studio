import { useEffect, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { apiJson } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Image, ShoppingBag, Palette, Shirt,
  Check, X, Trash2, Plus, Edit2, Coins, AlertCircle
} from "lucide-react";

interface AdminUser {
  id: number; email: string; displayName: string | null;
  role: string; tokenBalance: number; createdAt: string;
}
interface AdminArtwork {
  id: number; prompt: string; imageUrl: string; styleLabel: string | null;
  isShared: boolean; moderationStatus: string | null; userId: number | null;
}
interface AdminOrder {
  id: number; userId: number; status: string; totalPrice: number;
  color: string; size: string; createdAt: string;
  artwork: { imageUrl: string; prompt: string } | null;
}
interface Style {
  id: number; slug: string; label: string; description: string | null;
  icon: string | null; promptParams: string; active: boolean; sortOrder: number;
}
interface TshirtModel {
  id: number; name: string; description: string | null;
  availableColors: string[]; price: number; active: boolean;
}

export default function AdminPage() {
  const { user, loading, role } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [artworks, setArtworks] = useState<AdminArtwork[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [styles, setStyles] = useState<Style[]>([]);
  const [models, setModels] = useState<TshirtModel[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tokenDelta, setTokenDelta] = useState<Record<number, string>>({});
  const [styleForm, setStyleForm] = useState<Partial<Style> | null>(null);
  const [modelForm, setModelForm] = useState<Partial<TshirtModel> | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || role !== "admin") return;
    loadAll();
  }, [user, role]);

  async function loadAll() {
    setLoadingData(true);
    setError(null);
    try {
      const [u, a, o, s, m] = await Promise.all([
        apiJson<AdminUser[]>("/admin/users"),
        apiJson<AdminArtwork[]>("/admin/artworks"),
        apiJson<AdminOrder[]>("/admin/orders"),
        apiJson<Style[]>("/admin/styles"),
        apiJson<TshirtModel[]>("/admin/models"),
      ]);
      setUsers(u); setArtworks(a); setOrders(o);
      setStyles(s); setModels(m);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Acesso negado");
    } finally {
      setLoadingData(false);
    }
  }

  async function moderateArtwork(id: number, status: "approved" | "rejected") {
    await apiJson(`/admin/artworks/${id}/moderation`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setArtworks((prev) => prev.map((a) => a.id === id ? { ...a, moderationStatus: status } : a));
    toast({ title: status === "approved" ? "Aprovado!" : "Rejeitado" });
  }

  async function deleteArtwork(id: number) {
    if (!confirm("Deletar este artwork?")) return;
    await apiJson(`/admin/artworks/${id}`, { method: "DELETE" });
    setArtworks((prev) => prev.filter((a) => a.id !== id));
    toast({ title: "Deletado" });
  }

  async function adjustTokens(userId: number) {
    const delta = parseInt(tokenDelta[userId] ?? "0", 10);
    if (isNaN(delta)) return;
    const updated = await apiJson<AdminUser>(`/admin/users/${userId}/tokens`, {
      method: "PATCH",
      body: JSON.stringify({ delta, reason: "Admin adjustment" }),
    });
    // Use server-returned balance so client stays consistent with server-side clamp-to-zero
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, tokenBalance: updated.tokenBalance } : u));
    setTokenDelta((prev) => ({ ...prev, [userId]: "" }));
    toast({ title: "Tokens ajustados" });
  }

  async function saveStyle() {
    if (!styleForm) return;
    try {
      if (styleForm.id) {
        const updated = await apiJson<Style>(`/admin/styles/${styleForm.id}`, {
          method: "PATCH",
          body: JSON.stringify(styleForm),
        });
        setStyles((prev) => prev.map((s) => s.id === updated.id ? updated : s));
      } else {
        const created = await apiJson<Style>("/admin/styles", {
          method: "POST",
          body: JSON.stringify(styleForm),
        });
        setStyles((prev) => [...prev, created]);
      }
      setStyleForm(null);
      toast({ title: "Estilo salvo!" });
    } catch (e: unknown) { toast({ title: "Erro", description: e instanceof Error ? e.message : "Erro desconhecido", variant: "destructive" }); }
  }

  async function deleteStyle(id: number) {
    if (!confirm("Deletar estilo?")) return;
    await apiJson(`/admin/styles/${id}`, { method: "DELETE" });
    setStyles((prev) => prev.filter((s) => s.id !== id));
  }

  async function saveModel() {
    if (!modelForm) return;
    try {
      if (modelForm.id) {
        const updated = await apiJson<TshirtModel>(`/admin/models/${modelForm.id}`, {
          method: "PATCH",
          body: JSON.stringify(modelForm),
        });
        setModels((prev) => prev.map((m) => m.id === updated.id ? updated : m));
      } else {
        const created = await apiJson<TshirtModel>("/admin/models", {
          method: "POST",
          body: JSON.stringify(modelForm),
        });
        setModels((prev) => [...prev, created]);
      }
      setModelForm(null);
      toast({ title: "Modelo salvo!" });
    } catch (e: unknown) { toast({ title: "Erro", description: e instanceof Error ? e.message : "Erro desconhecido", variant: "destructive" }); }
  }

  async function deleteModel(id: number) {
    if (!confirm("Deletar modelo?")) return;
    await apiJson(`/admin/models/${id}`, { method: "DELETE" });
    setModels((prev) => prev.filter((m) => m.id !== id));
  }

  if (loading || !user) return null;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error} — Você precisa ter role admin.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const pending = artworks.filter((a) => a.isShared && a.moderationStatus === "pending");

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-1">Painel Admin</h1>
          <p className="text-muted-foreground">Gerencie usuários, artworks, pedidos e configurações</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Usuários", value: users.length, icon: <Users className="w-5 h-5" />, color: "text-blue-500" },
            { label: "Artworks", value: artworks.length, icon: <Image className="w-5 h-5" />, color: "text-purple-500" },
            { label: "Pedidos", value: orders.length, icon: <ShoppingBag className="w-5 h-5" />, color: "text-green-500" },
            { label: "Pendentes", value: pending.length, icon: <AlertCircle className="w-5 h-5" />, color: "text-orange-500" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={stat.color}>{stat.icon}</div>
                <div>
                  <p className="text-2xl font-black">{loadingData ? "—" : stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="artworks">
          <TabsList className="mb-6">
            <TabsTrigger value="artworks" className="gap-2">
              <Image className="w-4 h-4" /> Artworks
              {pending.length > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5">{pending.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2"><Users className="w-4 h-4" /> Usuários</TabsTrigger>
            <TabsTrigger value="orders" className="gap-2"><ShoppingBag className="w-4 h-4" /> Pedidos</TabsTrigger>
            <TabsTrigger value="styles" className="gap-2"><Palette className="w-4 h-4" /> Estilos</TabsTrigger>
            <TabsTrigger value="models" className="gap-2"><Shirt className="w-4 h-4" /> Modelos</TabsTrigger>
          </TabsList>

          {/* Artworks */}
          <TabsContent value="artworks">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {loadingData ? [...Array(8)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-2xl" />) :
                artworks.map((artwork) => (
                  <div key={artwork.id} className="relative rounded-2xl overflow-hidden border border-border bg-card">
                    <div className="aspect-square">
                      <img src={artwork.imageUrl} alt={artwork.prompt} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-2">
                      <p className="text-xs line-clamp-1 text-muted-foreground mb-2">{artwork.prompt}</p>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">
                          {artwork.moderationStatus ?? "private"}
                        </Badge>
                        {artwork.isShared && artwork.moderationStatus === "pending" && (
                          <>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-600" onClick={() => moderateArtwork(artwork.id, "approved")}>
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => moderateArtwork(artwork.id, "rejected")}>
                              <X className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive ml-auto" onClick={() => deleteArtwork(artwork.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </TabsContent>

          {/* Users */}
          <TabsContent value="users">
            <div className="space-y-3">
              {loadingData ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />) :
                users.map((u) => (
                  <Card key={u.id}>
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{u.displayName ?? u.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{u.tokenBalance} tokens</span>
                        <Input
                          type="number"
                          placeholder="+/-"
                          className="w-20 h-8 text-sm"
                          value={tokenDelta[u.id] ?? ""}
                          onChange={(e) => setTokenDelta((prev) => ({ ...prev, [u.id]: e.target.value }))}
                        />
                        <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => adjustTokens(u.id)}>
                          <Coins className="w-3 h-3" /> Ajustar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              }
            </div>
          </TabsContent>

          {/* Orders */}
          <TabsContent value="orders">
            <div className="space-y-3">
              {loadingData ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) :
                orders.map((order) => (
                  <Card key={order.id}>
                    <CardContent className="p-4 flex items-center gap-4">
                      {order.artwork && (
                        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                          <img src={order.artwork.imageUrl} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">Pedido #{order.id}</p>
                        <p className="text-xs text-muted-foreground">{order.artwork?.prompt?.slice(0, 60) ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{order.color} · {order.size}</p>
                      </div>
                      <Badge variant={order.status === "paid" ? "default" : "secondary"}>
                        {order.status}
                      </Badge>
                      <p className="font-bold text-primary">R$ {order.totalPrice.toFixed(2).replace(".", ",")}</p>
                    </CardContent>
                  </Card>
                ))
              }
            </div>
          </TabsContent>

          {/* Styles */}
          <TabsContent value="styles">
            <div className="flex justify-end mb-4">
              <Button className="gap-2" onClick={() => setStyleForm({ active: true, sortOrder: styles.length + 1, promptParams: "" })}>
                <Plus className="w-4 h-4" /> Novo estilo
              </Button>
            </div>
            {styleForm !== null && (
              <Card className="mb-6 border-primary/40">
                <CardHeader><CardTitle>{styleForm.id ? "Editar Estilo" : "Novo Estilo"}</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Slug</Label>
                    <Input value={styleForm.slug ?? ""} onChange={(e) => setStyleForm((p) => ({ ...p, slug: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Label</Label>
                    <Input value={styleForm.label ?? ""} onChange={(e) => setStyleForm((p) => ({ ...p, label: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>Parâmetros de Prompt</Label>
                    <Textarea rows={3} value={styleForm.promptParams ?? ""} onChange={(e) => setStyleForm((p) => ({ ...p, promptParams: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Descrição</Label>
                    <Input value={styleForm.description ?? ""} onChange={(e) => setStyleForm((p) => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ícone (emoji)</Label>
                    <Input value={styleForm.icon ?? ""} onChange={(e) => setStyleForm((p) => ({ ...p, icon: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ordem de exibição</Label>
                    <Input type="number" value={styleForm.sortOrder ?? ""} onChange={(e) => setStyleForm((p) => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      id="style-active"
                      type="checkbox"
                      checked={styleForm.active ?? true}
                      onChange={(e) => setStyleForm((p) => ({ ...p, active: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <Label htmlFor="style-active">Ativo</Label>
                  </div>
                  <div className="col-span-2 flex gap-3">
                    <Button onClick={saveStyle}>Salvar</Button>
                    <Button variant="outline" onClick={() => setStyleForm(null)}>Cancelar</Button>
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="space-y-3">
              {styles.map((style) => (
                <Card key={style.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <span className="text-2xl">{style.icon ?? "🎨"}</span>
                    <div className="flex-1">
                      <p className="font-semibold">{style.label} <span className="text-muted-foreground font-normal text-sm">({style.slug})</span></p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{style.promptParams}</p>
                    </div>
                    <Badge variant={style.active ? "default" : "secondary"}>{style.active ? "Ativo" : "Inativo"}</Badge>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setStyleForm(style)}><Edit2 className="w-3 h-3" /></Button>
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => deleteStyle(style.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Models */}
          <TabsContent value="models">
            <div className="flex justify-end mb-4">
              <Button className="gap-2" onClick={() => setModelForm({ active: true, availableColors: [], price: 0 })}>
                <Plus className="w-4 h-4" /> Novo modelo
              </Button>
            </div>
            {modelForm !== null && (
              <Card className="mb-6 border-primary/40">
                <CardHeader><CardTitle>{modelForm.id ? "Editar Modelo" : "Novo Modelo"}</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Nome</Label>
                    <Input value={modelForm.name ?? ""} onChange={(e) => setModelForm((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Preço (R$)</Label>
                    <Input type="number" step="0.01" value={modelForm.price ?? ""} onChange={(e) => setModelForm((p) => ({ ...p, price: parseFloat(e.target.value) }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Descrição</Label>
                    <Input value={modelForm.description ?? ""} onChange={(e) => setModelForm((p) => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cores (separadas por vírgula)</Label>
                    <Input
                      value={(modelForm.availableColors ?? []).join(", ")}
                      onChange={(e) => setModelForm((p) => ({ ...p, availableColors: e.target.value.split(",").map((c) => c.trim()).filter(Boolean) }))}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      id="model-active"
                      type="checkbox"
                      checked={modelForm.active ?? true}
                      onChange={(e) => setModelForm((p) => ({ ...p, active: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <Label htmlFor="model-active">Ativo</Label>
                  </div>
                  <div className="col-span-2 flex gap-3">
                    <Button onClick={saveModel}>Salvar</Button>
                    <Button variant="outline" onClick={() => setModelForm(null)}>Cancelar</Button>
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="space-y-3">
              {models.map((model) => (
                <Card key={model.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1">
                      <p className="font-semibold">{model.name}</p>
                      <p className="text-xs text-muted-foreground">{model.description}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {model.availableColors.map((c) => (
                          <span key={c} className="text-xs bg-muted px-1.5 py-0.5 rounded">{c}</span>
                        ))}
                      </div>
                    </div>
                    <p className="font-bold text-primary">R$ {model.price.toFixed(2).replace(".", ",")}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setModelForm(model)}><Edit2 className="w-3 h-3" /></Button>
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => deleteModel(model.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
