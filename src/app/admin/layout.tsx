"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useAuth } from "@/lib/firebase/useAuth";

const NAV_LINKS = [
  { href: "/admin", label: "Painel", icon: "ti-layout-dashboard" },
  { href: "/admin/games", label: "Jogos", icon: "ti-ball-football" },
  { href: "/admin/people", label: "Pessoas", icon: "ti-users" },
  { href: "/admin/competitions", label: "Competições", icon: "ti-trophy" },
  { href: "/admin/editions", label: "Edições", icon: "ti-calendar-event" },
  { href: "/admin/opponents", label: "Adversários", icon: "ti-shield" },
  { href: "/admin/venues", label: "Locais", icon: "ti-building-stadium" },
  { href: "/admin/cities", label: "Cidades", icon: "ti-map-pin" },
  { href: "/admin/sources", label: "Fontes", icon: "ti-file-description" },
  { href: "/admin/photos", label: "Fotos", icon: "ti-photo" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="app">
        <div className="main" style={{ justifyContent: "center", alignItems: "center" }}>
          <p style={{ color: "var(--tx3)" }}>Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="hdr">
        <img
          className="hdr-logo"
          src="/logo.png"
          alt="AD Jaraguá"
        />
        <div>
          <div className="hdr-name">AD JARAGUÁ</div>
          <div className="hdr-sub">Associação Desportiva Jaraguá · Est. 1992</div>
        </div>
        <div className="hdr-sp" />
        <span className="hdr-user">{user.displayName ?? user.email}</span>
        <button className="hdr-btn" onClick={() => signOut(auth)}>
          <i className="ti ti-logout" />
          Sair
        </button>
      </header>

      <nav className="nav">
        {NAV_LINKS.map(({ href, label, icon }) => {
          const isActive = href === "/admin" ? pathname === "/admin" : pathname?.startsWith(href);
          return (
            <button
              key={href}
              className={`nav-btn${isActive ? " active" : ""}`}
              onClick={() => router.push(href)}
            >
              <i className={`ti ${icon}`} />
              {label}
            </button>
          );
        })}
      </nav>

      <main className="main">
        {children}
      </main>
    </div>
  );
}
