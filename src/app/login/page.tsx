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
      const code = (err as { code?: string })?.code ?? "desconhecido";
      const message = err instanceof Error ? err.message : String(err);
      setError(`Erro (${code}): ${message}`);
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
    } catch {
      setError("E-mail ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app" style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 400, padding: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "var(--pr)" }}>AD JARAGUÁ</div>
          <div style={{ fontSize: 12, color: "var(--tx3)", marginTop: 4 }}>Associação Desportiva Jaraguá · Est. 1992</div>
        </div>

        <div className="card">
          <button className="btn" style={{ width: "100%", marginBottom: 16 }} onClick={handleGoogleLogin} disabled={loading}>
            <i className="ti ti-brand-google" />
            {loading ? "Entrando..." : "Entrar com Google"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
            <hr style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: "var(--tx3)", fontWeight: 700 }}>OU</span>
            <hr style={{ flex: 1 }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
            <label>
              E-mail
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              Senha
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="btn-secondary" type="submit" disabled={loading} style={{ width: "100%" }}>
              {loading ? "Entrando..." : "Entrar com e-mail e senha"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
