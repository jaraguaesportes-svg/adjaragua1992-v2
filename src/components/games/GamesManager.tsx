"use client";

import { useEffect, useState } from "react";
import { archiveDocument, createDocument, listCollection, restoreDocument, upsertDocument } from "@/lib/services/firestore";
import { recalculateStatisticsForGameParticipants } from "@/lib/services/statistics";
import type { Game } from "@/types/games";
import { deriveResult, deriveGameSlug, type GameInput } from "@/lib/schemas/games";
import { GameForm } from "./GameForm";

function textToIds(text?: string): string[] {
  if (!text) return [];
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildGamePayload(data: GameInput) {
  const { startersText, substitutesText, participatedText, ...rest } = data;
  return {
    ...rest,
    slug: deriveGameSlug({
      date: data.date,
      homeAway: data.homeAway,
      opponentId: data.opponentId,
      jaraguaGoals: Number(data.jaraguaGoals),
      opponentGoals: Number(data.opponentGoals),
    }),
    starters: textToIds(startersText),
    substitutes: textToIds(substitutesText),
    participated: textToIds(participatedText),
    result: deriveResult(Number(data.jaraguaGoals), Number(data.opponentGoals)),
  };
}

function gameLabel(data: { date: string; opponentId: string }) {
  return `${data.date} x ${data.opponentId}`;
}

export function GamesManager() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Game | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await listCollection<Game>("games");
      setGames(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar jogos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(data: GameInput) {
    const payload = buildGamePayload(data);
    await createDocument("games", payload, gameLabel(data));
    await recalculateStatisticsForGameParticipants(payload);
    setShowForm(false);
    await refresh();
  }

  async function handleUpdate(data: GameInput) {
    if (!editing) return;
    const payload = buildGamePayload(data);
    await upsertDocument("games", editing.id, payload, {
      entityName: gameLabel(data),
      before: editing,
    });
    // Recalcula tanto quem estava no jogo antes quanto quem está agora,
    // já que a edição pode ter trocado jogadores.
    await recalculateStatisticsForGameParticipants(editing);
    await recalculateStatisticsForGameParticipants(payload);
    setEditing(null);
    await refresh();
  }

  async function handleArchive(game: Game) {
    if (!confirm(`Arquivar jogo de ${game.date}?`)) return;
    await archiveDocument("games", game.id, gameLabel(game));
    await recalculateStatisticsForGameParticipants(game);
    await refresh();
  }

  async function handleRestore(game: Game) {
    await restoreDocument("games", game.id, gameLabel(game));
    await recalculateStatisticsForGameParticipants(game);
    await refresh();
  }

  return (
    <section className="card">
      <div className="actions">
        <h2>Jogos</h2>
        <button className="btn" onClick={() => { setEditing(null); setShowForm((v) => !v); }}>
          {showForm ? "Fechar" : "Novo registro"}
        </button>
      </div>

      {showForm && !editing && (
        <GameForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {editing && (
        <GameForm
          initialValues={editing}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(null)}
        />
      )}

      {loading && <p>Carregando...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Adversário</th>
              <th>Placar</th>
              <th>Resultado</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => (
              <tr key={game.id}>
                <td>{game.date}</td>
                <td>{game.opponentId}</td>
                <td>{game.jaraguaGoals} x {game.opponentGoals}</td>
                <td>{game.result}</td>
                <td>{game.status}</td>
                <td>
                  <button className="btn-link" onClick={() => { setShowForm(false); setEditing(game); }}>
                    Editar
                  </button>
                  {game.status === "archived" ? (
                    <button className="btn-link" onClick={() => handleRestore(game)}>
                      Restaurar
                    </button>
                  ) : (
                    <button className="btn-link" onClick={() => handleArchive(game)}>
                      Arquivar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {games.length === 0 && (
              <tr>
                <td colSpan={6}>Nenhum jogo cadastrado ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}
