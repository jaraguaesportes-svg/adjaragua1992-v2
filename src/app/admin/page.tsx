"use client";

import { useEffect, useState } from "react";
import { listCollection } from "@/lib/services/firestore";
import type { Game } from "@/types/games";
import Link from "next/link";

type CollectionSummary = {
  label: string;
  href: string;
  count: number | null;
  loading: boolean;
  stats?: string;
};

const COLLECTIONS = [
  { key: "games", label: "Jogos", href: "/admin/games" },
  { key: "people", label: "Pessoas", href: "/admin/people" },
  { key: "competitions", label: "Competições", href: "/admin/competitions" },
  { key: "editions", label: "Edições", href: "/admin/editions" },
  { key: "opponents", label: "Adversários", href: "/admin/opponents" },
  { key: "venues", label: "Locais", href: "/admin/venues" },
  { key: "cities", label: "Cidades", href: "/admin/cities" },
  { key: "sources", label: "Fontes", href: "/admin/sources" },
] as const;

export default function AdminPage() {
  const [summaries, setSummaries] = useState<CollectionSummary[]>(
    COLLECTIONS.map((c) => ({ label: c.label, href: c.href, count: null, loading: true }))
  );
  const [gameStats, setGameStats] = useState<{ wins: number; draws: number; losses: number; goals: number } | null>(null);

  useEffect(() => {
    COLLECTIONS.forEach(async (col, index) => {
      try {
        const data = await listCollection<{ id: string; status?: string }>(col.key);
        const active = data.filter((d) => d.status === "active").length;
        const archived = data.filter((d) => d.status === "archived").length;
        setSummaries((prev) => {
          const next = [...prev];
          next[index] = {
            ...next[index],
            count: active,
            loading: false,
            stats: archived > 0 ? `${archived} arquivado(s)` : undefined,
          };
          return next;
        });

        if (col.key === "games") {
          const games = data as unknown as Game[];
          const activeGames = games.filter((g) => g.status === "active");
          const wins = activeGames.filter((g) => g.result === "win").length;
          const draws = activeGames.filter((g) => g.result === "draw").length;
          const losses = activeGames.filter((g) => g.result === "loss").length;
          const goals = activeGames.reduce((acc, g) => acc + (g.jaraguaGoals ?? 0), 0);
          setGameStats({ wins, draws, losses, goals });
        }
      } catch {
        setSummaries((prev) => {
          const next = [...prev];
          next[index] = { ...next[index], count: 0, loading: false };
          return next;
        });
      }
    });
  }, []);

  return (
    <div>
      {gameStats && (
        <section className="card" style={{ marginBottom: 20 }}>
          <h2>AD Jaraguá — Resumo histórico</h2>
          <div className="grid grid-2">
            <div>
              <p><strong>Jogos registrados:</strong> {summaries[0].count ?? "..."}</p>
              <p><strong>Vitórias:</strong> {gameStats.wins}</p>
              <p><strong>Empates:</strong> {gameStats.draws}</p>
              <p><strong>Derrotas:</strong> {gameStats.losses}</p>
            </div>
            <div>
              <p><strong>Gols marcados:</strong> {gameStats.goals}</p>
              <p><strong>Aproveitamento:</strong> {
                summaries[0].count
                  ? `${((gameStats.wins * 3 / (summaries[0].count * 3)) * 100).toFixed(1)}%`
                  : "—"
              }</p>
              <p><strong>Pessoas cadastradas:</strong> {summaries[1].count ?? "..."}</p>
              <p><strong>Adversários:</strong> {summaries[4].count ?? "..."}</p>
            </div>
          </div>
        </section>
      )}

      <section className="grid grid-2">
        {summaries.map((s) => (
          <Link key={s.href} href={s.href} style={{ textDecoration: "none" }}>
            <div className="card card-hover">
              <div className="actions">
                <h3>{s.label}</h3>
                <span className="count-badge">
                  {s.loading ? "..." : s.count}
                </span>
              </div>
              {s.stats && <p className="hint">{s.stats}</p>}
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
