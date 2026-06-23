"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      router.push("/admin");
    } catch (err) {
      setError(
        err instanceof Error
          ? "Não foi possível entrar com Google. Tente novamente."
          : "Erro desconhecido"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/admin");
    } catch (err) {
      setError(
        err instanceof Error
          ? "Não foi possível entrar. Verifique e-mail e senha."
          : "Erro desconhecido"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <h1>Login administrativo</h1>
      <div className="card">
        <button className="btn" type="button" onClick={handleGoogleLogin} disabled={loading}>
          {loading ? "Entrando..." : "Entrar com Google"}
        </button>
      </div>

      <p style={{ textAlign: "center", margin: "16px 0" }}>ou</p>

      <form className="card" onSubmit={handleSubmit}>
        <label>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="actions">
          <button className="btn-secondary" type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar com e-mail e senha"}
          </button>
        </div>
      </form>
    </main>
  );
}
