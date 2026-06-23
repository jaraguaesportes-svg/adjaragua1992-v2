"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useAuth } from "@/lib/firebase/useAuth";

const links = [
  ["/admin", "Painel"],
  ["/admin/people", "Pessoas"],
  ["/admin/games", "Jogos"],
  ["/admin/competitions", "Competições"],
  ["/admin/editions", "Edições"],
  ["/admin/opponents", "Adversários"],
  ["/admin/venues", "Locais"],
  ["/admin/cities", "Cidades"],
  ["/admin/sources", "Fontes"],
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <main className="container">
        <p>Verificando autenticação...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="container">
        <p>Redirecionando para login...</p>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="actions">
        <h1>Administração</h1>
        <div>
          <span style={{ marginRight: 12 }}>{user.email}</span>
          <button className="btn-secondary" onClick={() => signOut(auth)}>
            Sair
          </button>
        </div>
      </div>
      <nav>{links.map(([href, label]) => <a key={href} href={href}>{label}</a>)}</nav>
      <hr />
      {children}
    </main>
  );
}
