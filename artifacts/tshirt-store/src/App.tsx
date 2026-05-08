import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { GuestSessionProvider } from "@/contexts/GuestSessionContext";
import { AppHeader, BottomNav } from "@/components/Navbar";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import AuthPage from "@/pages/auth";
import CreatePage from "@/pages/create";
import GalleryPage from "@/pages/gallery";
import ProductPage from "@/pages/product";
import OrdersPage from "@/pages/orders";
import MyArtworksPage from "@/pages/my-artworks";
import AdminPage from "@/pages/admin/index";

function AdminRoute() {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (role !== "admin") return <Redirect to="/" />;
  return <AdminPage />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

function AppRoutes() {
  return (
    <div className="max-w-[480px] mx-auto min-h-screen flex flex-col bg-background relative">
      <AppHeader />
      <main className="flex-1 pb-[80px]">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/create" component={CreatePage} />
          <Route path="/editor" component={CreatePage} />
          <Route path="/gallery" component={GalleryPage} />
          <Route path="/product/:id" component={ProductPage} />
          <Route path="/orders" component={OrdersPage} />
          <Route path="/my-artworks" component={MyArtworksPage} />
          <Route path="/admin" component={AdminRoute} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GuestSessionProvider>
          <WouterRouter base={BASE_URL}>
            <AppRoutes />
          </WouterRouter>
          <Toaster />
        </GuestSessionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
