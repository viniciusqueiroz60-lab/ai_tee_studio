import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useGuestSession } from "@/contexts/GuestSessionContext";
import { logout } from "@/lib/firebase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Home, Compass, Plus, Heart, User,
  Coins, ShoppingBag, Image, Shield, LogOut,
} from "lucide-react";

const NAV_LINKS = [
  { href: "/",            icon: Home,    label: "Início"    },
  { href: "/gallery",     icon: Compass, label: "Explorar"  },
  { href: "/create",      icon: Plus,    label: "Criar"     },
  { href: "/my-artworks", icon: Heart,   label: "Favoritos" },
];

function isActive(location: string, href: string) {
  if (href === "/") return location === "/";
  return location.startsWith(href);
}

export function AppHeader() {
  const { user, tokenBalance, loading, role } = useAuth();
  const { session } = useGuestSession();
  const [location] = useLocation();

  const balance = user ? (tokenBalance ?? 0) : (session?.tokenBalance ?? 0);

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[60px] flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/">
          <span className="font-display text-2xl tracking-tight text-foreground select-none whitespace-nowrap">
            Tee Studio
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {NAV_LINKS.map(({ href, icon: Icon, label }) => {
            const active = isActive(location, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right side: token + auth */}
        <div className="flex items-center gap-3">
          {!loading && (
            <div className="flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1.5 text-sm font-medium">
              <Coins className="w-4 h-4 text-amber-500" />
              <span>{balance}</span>
            </div>
          )}

          {!loading && (
            user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="outline-none">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.photoURL ?? undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {user.displayName?.[0] ?? user.email?.[0]?.toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium truncate">{user.displayName ?? "Usuário"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/my-artworks" className="flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      Meus Designs
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/orders" className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4" />
                      Pedidos
                    </Link>
                  </DropdownMenuItem>
                  {role === "admin" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Admin
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth">
                  <button className="hidden md:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Entrar
                  </button>
                </Link>
                <Link href="/auth?signup=true">
                  <button className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity">
                    Cadastrar
                  </button>
                </Link>
              </div>
            )
          )}
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const [location] = useLocation();

  const tabs = [
    { href: "/",            icon: Home,    label: "Início"    },
    { href: "/gallery",     icon: Compass, label: "Explorar"  },
    { href: "/create",      icon: Plus,    label: "Criar",    isCreate: true },
    { href: "/my-artworks", icon: Heart,   label: "Favoritos" },
    { href: "/auth",        icon: User,    label: "Perfil"    },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 h-[70px] bg-card border-t border-border z-50 flex justify-around items-center px-2"
      style={{ boxShadow: "0 -2px 10px rgba(0,0,0,0.05)" }}
    >
      {tabs.map(({ href, icon: Icon, label, isCreate }) => {
        const active = isActive(location, href);
        if (isCreate) {
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-1 relative" style={{ top: "-15px" }}>
              <div
                className="w-[50px] h-[50px] rounded-full bg-primary flex items-center justify-center shadow-lg"
                style={{ boxShadow: "0 4px 12px rgba(199,91,58,0.4)" }}
              >
                <Icon className="w-7 h-7 text-white" />
              </div>
              <span className="text-[10px] text-muted-foreground mt-1">{label}</span>
            </Link>
          );
        }
        return (
          <Link key={href} href={href} className="flex flex-col items-center gap-1 w-[60px]">
            <Icon className={`w-6 h-6 ${active ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`text-[10px] ${active ? "text-primary font-medium" : "text-muted-foreground"}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function Navbar() {
  return null;
}
