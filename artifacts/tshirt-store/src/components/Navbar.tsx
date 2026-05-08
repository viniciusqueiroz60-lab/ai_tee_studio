import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useGuestSession } from "@/contexts/GuestSessionContext";
import { logout } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Zap, ShoppingBag, Image, LayoutGrid, Shield, LogOut, User, Menu } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { user, tokenBalance, loading, role } = useAuth();
  const { session } = useGuestSession();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const balance = user ? (tokenBalance ?? 0) : (session?.tokenBalance ?? 0);

  const navLinks = [
    { href: "/create", label: "Criar", icon: <Zap className="w-4 h-4" /> },
    { href: "/gallery", label: "Galeria", icon: <LayoutGrid className="w-4 h-4" /> },
    { href: "/orders", label: "Pedidos", icon: <ShoppingBag className="w-4 h-4" /> },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Image className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="gradient-text">ArtTee</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location === link.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Token balance */}
            {!loading && (
              <Badge variant="secondary" className="gap-1.5 font-semibold">
                <Zap className="w-3 h-3 text-primary" />
                {balance}
              </Badge>
            )}

            {/* Auth */}
            {!loading && (
              user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative w-9 h-9 rounded-full p-0">
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={user.photoURL ?? undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {user.displayName?.[0] ?? user.email?.[0]?.toUpperCase() ?? "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
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
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/auth">Entrar</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/auth?signup=true">Cadastrar</Link>
                  </Button>
                </div>
              )
            )}

            {/* Mobile menu */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden pb-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
                  location === link.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
