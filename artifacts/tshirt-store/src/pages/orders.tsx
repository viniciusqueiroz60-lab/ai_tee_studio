import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useGetMyOrders } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShoppingBag, CheckCircle2, Clock, XCircle, Package } from "lucide-react";
import { motion } from "framer-motion";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const STATUS_CONFIG: Record<string, { label: string; color: BadgeVariant; icon: typeof Clock }> = {
  pending: { label: "Aguardando pagamento", color: "secondary", icon: Clock },
  paid: { label: "Pago", color: "default", icon: CheckCircle2 },
  processing: { label: "Em produção", color: "default", icon: Package },
  shipped: { label: "Enviado", color: "default", icon: Package },
  delivered: { label: "Entregue", color: "default", icon: CheckCircle2 },
  cancelled: { label: "Cancelado", color: "destructive", icon: XCircle },
};

export default function OrdersPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const { data: orders, isLoading: ordersLoading } = useGetMyOrders();

  const success = new URLSearchParams(window.location.search).get("success") === "true";

  if (loading || !user) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-3xl mx-auto px-4">
          <Skeleton className="h-8 w-48 mb-6" />
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full mb-4 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-2">Meus Pedidos</h1>
          <p className="text-muted-foreground">Acompanhe seus pedidos de camiseta</p>
        </div>

        {success && (
          <Alert className="mb-6 border-green-500/30 bg-green-500/10">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-400">
              Pagamento confirmado! Seu pedido está sendo processado.
            </AlertDescription>
          </Alert>
        )}

        {ordersLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="text-center py-24">
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-xl font-semibold mb-2">Nenhum pedido ainda</h3>
            <p className="text-muted-foreground mb-8">Crie um design e peça sua primeira camiseta!</p>
            <Button asChild>
              <Link href="/create">Criar design</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, i) => {
              const status = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
              const Icon = status.icon;
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Card className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-0">
                      <div className="flex">
                        {/* Artwork thumbnail */}
                        <div className="w-32 h-32 flex-shrink-0 bg-muted">
                          {order.artwork && (
                            <img
                              src={order.artwork.imageUrl}
                              alt={order.artwork.prompt}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        {/* Details */}
                        <div className="flex-1 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-sm line-clamp-1">
                                {order.artwork?.prompt ?? "Design personalizado"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Pedido #{order.id} · {order.color} · {order.size}
                              </p>
                            </div>
                            <Badge variant={status.color} className="flex-shrink-0 gap-1">
                              <Icon className="w-3 h-3" />
                              {status.label}
                            </Badge>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <p className="font-bold text-primary">
                              R$ {order.totalPrice.toFixed(2).replace(".", ",")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
