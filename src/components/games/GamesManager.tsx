"use client";

import { useEffect, useState } from "react";
import { archiveDocument, createDocument, getDocument, listCollection, restoreDocument, upsertDocument } from "@/lib/services/firestore";
import { recalculateStatisticsForGameParticipants } from "@/lib/services/statistics";
import { migrateLegacyPeopleReferencesInGames, migrateLegacyOpponentReferencesInGames, migrateLegacyVenueReferencesInGames, migrateLegacyCityReferencesInGames } from "@/lib/services/migratePeople";
import type { Game } from "@/types/games";
import type { Opponent } from "@/types/opponents";
import type { Venue } from "@/types/venues";
import { deriveResult, deriveGameSlug, type GameInput } from "@/lib/schemas/games";
import { GameForm } from "./GameForm";

async function buildGamePayload(data: GameInput) {
  const opponent = await getDocument<Opponent>("opponents", data.opponentId);
  const opponentLabel = opponent?.slug ?? opponent?.name ?? data.opponentId;
  return {
    ...data,
    starters: (data.starters ?? []).filter(Boolean),
    substitutes: (data.substitutes ?? []).filter(Boolean),
    participated: (data.participated ?? []).filter(Boolean),
    opponentStarters: (data.opponentStarters ?? []).filter(Boolean),
    opponentSubstitutes: (data.opponentSubstitutes ?? []).filter(Boolean),
    opponentParticipated: (data.opponentParticipated ?? []).filter(Boolean),
    slug: deriveGameSlug({
      date: data.date,
      homeAway: data.homeAway,
      opponentId: opponentLabel,
      jaraguaGoals: Number(data.jaraguaGoals),
      opponentGoals: Number(data.opponentGoals),
    }),
    result: deriveResult(Number(data.jaraguaGoals), Number(data.opponentGoals)),
    opponentName: opponent?.name,
  };
}

export function GamesManager() {
  const [games, setGames] = useState<Game[]>([]);
  const [opponentNames, setOpponentNames] = useState<Record<string, string>>({});
  const [venueNames, setVenueNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Game | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [data, opponents, venues] = await Promise.all([
        listCollection<Game>("games"),
        listCollection<Opponent>("opponents"),
        listCollection<Venue>("venues"),
      ]);
      setGames(data);
      setOpponentNames(Object.fromEntries(opponents.map((o) => [o.id, o.name])));
      setVenueNames(Object.fromEntries(venues.map((v) => [v.id, v.name])));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar jogos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function gameLabel(data: { date: string; opponentId: string }) {
    return `${data.date} x ${opponentNames[data.opponentId] ?? data.opponentId}`;
  }

  async function handleCreate(data: GameInput) {
    const payload = await buildGamePayload(data);
    await createDocument("games", payload, gameLabel(data));
    await recalculateStatisticsForGameParticipants(payload);
    setShowForm(false);
    await refresh();
  }

  async function handleUpdate(data: GameInput) {
    if (!editing) return;
    const payload = await buildGamePayload(data);
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

  async function handleMigrate() {
    if (!confirm("Corrigir pessoas, adversários, locais e cidades de jogos antigos (criar/vincular registros reais a partir dos nomes digitados)?")) return;
    setMigrating(true);
    setMigrationResult(null);
    try {
      const peopleResult = await migrateLegacyPeopleReferencesInGames();
      const opponentResult = await migrateLegacyOpponentReferencesInGames();
      const venueResult = await migrateLegacyVenueReferencesInGames();
      const cityResult = await migrateLegacyCityReferencesInGames();
      setMigrationResult(
        `Pessoas: ${peopleResult.createdCount} criada(s), ${peopleResult.updatedGamesCount} jogo(s) corrigido(s). ` +
        `Adversários: ${opponentResult.createdCount} criado(s), ${opponentResult.updatedGamesCount} jogo(s) corrigido(s). ` +
        `Locais: ${venueResult.createdCount} criado(s), ${venueResult.updatedGamesCount} jogo(s) corrigido(s). ` +
        `Cidades: ${cityResult.createdCount} criada(s), ${cityResult.updatedGamesCount} jogo(s) corrigido(s).`
      );
      await refresh();
    } catch (err) {
      setMigrationResult(err instanceof Error ? `Erro: ${err.message}` : "Erro desconhecido na migração.");
    } finally {
      setMigrating(false);
    }
  }

  return (
    <section className="card">
      <div className="actions">
        <h2>Jogos</h2>
        <button className="btn" onClick={() => { setEditing(null); setShowForm((v) => !v); }}>
          {showForm ? "Fechar" : "Novo registro"}
        </button>
      </div>

      <div className="actions">
        <button className="btn-secondary" onClick={handleMigrate} disabled={migrating}>
          {migrating ? "Corrigindo..." : "Corrigir pessoas, adversários, locais e cidades de jogos antigos"}
        </button>
      </div>
      {migrationResult && <p>{migrationResult}</p>}

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
              <th>Local</th>
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
                <td>{opponentNames[game.opponentId] ?? game.opponentId}</td>
                <td>{venueNames[game.venueId] ?? game.venueId}</td>
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
                <td colSpan={7}>Nenhum jogo cadastrado ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}
