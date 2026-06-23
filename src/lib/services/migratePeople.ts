import { createDocument, listCollection, upsertDocument } from "@/lib/services/firestore";
import { derivePersonSlug } from "@/lib/schemas/people";
import type { Game } from "@/types/games";
import type { Person } from "@/types/people";
import { recalculatePersonStatistics } from "@/lib/services/statistics";

/**
 * Corrige jogos cadastrados antes de existir o seletor de pessoas: campos como
 * starters/substitutes/participated/coachId/goals[].personId podiam conter o
 * nome digitado livremente em vez do AutoID real da pessoa.
 *
 * Para cada valor que não corresponde a um id de pessoa existente, esta rotina:
 *   1. Procura uma pessoa existente com esse nome (nickname ou fullName) —
 *      reaproveita se encontrar (Volume III 4.7-4.9, sem fusão automática por
 *      nome quando houver qualquer ambiguidade: aqui a correspondência é exata
 *      e mantém-se conservadora).
 *   2. Se não encontrar, cria uma pessoa nova (cadastro provisório, Volume III 4.12-4.13).
 *   3. Atualiza o jogo para referenciar o AutoID real.
 *   4. Recalcula estatísticas das pessoas afetadas.
 */
export async function migrateLegacyPeopleReferencesInGames() {
  const [games, people] = await Promise.all([
    listCollection<Game>("games"),
    listCollection<Person>("people"),
  ]);

  const idSet = new Set(people.map((p) => p.id));
  const byExactName = new Map<string, string>(); // nome normalizado -> personId
  for (const p of people) {
    byExactName.set(p.nickname.trim().toLowerCase(), p.id);
    if (p.fullName) byExactName.set(p.fullName.trim().toLowerCase(), p.id);
  }

  let createdCount = 0;
  let updatedGamesCount = 0;
  const touchedPersonIds = new Set<string>();

  async function resolve(raw: string | undefined): Promise<string | undefined> {
    if (!raw) return raw;
    if (idSet.has(raw)) return raw; // já é um AutoID válido, nada a fazer
    const key = raw.trim().toLowerCase();
    if (!key) return undefined;
    const existing = byExactName.get(key);
    if (existing) return existing;

    // Não encontrado: cria cadastro provisório
    const ref = await createDocument(
      "people",
      {
        nickname: raw.trim(),
        gender: "male",
        roles: ["player"],
        primaryRole: "player",
        identificationStatus: "unknown",
        slug: derivePersonSlug(raw.trim()),
      },
      raw.trim()
    );
    idSet.add(ref.id);
    byExactName.set(key, ref.id);
    createdCount += 1;
    return ref.id;
  }

  for (const game of games) {
    let changed = false;
    const newStarters: string[] = [];
    for (const raw of game.starters ?? []) {
      const resolved = await resolve(raw);
      if (resolved) {
        newStarters.push(resolved);
        if (resolved !== raw) changed = true;
      }
    }
    const newSubstitutes: string[] = [];
    for (const raw of game.substitutes ?? []) {
      const resolved = await resolve(raw);
      if (resolved) {
        newSubstitutes.push(resolved);
        if (resolved !== raw) changed = true;
      }
    }
    const newParticipated: string[] = [];
    for (const raw of game.participated ?? []) {
      const resolved = await resolve(raw);
      if (resolved) {
        newParticipated.push(resolved);
        if (resolved !== raw) changed = true;
      }
    }
    const newGoals = [];
    for (const g of game.goals ?? []) {
      const resolved = await resolve(g.personId);
      if (resolved !== g.personId) changed = true;
      newGoals.push({ ...g, personId: resolved ?? g.personId });
    }
    let newCoachId = game.coachId;
    if (game.coachId) {
      const resolved = await resolve(game.coachId);
      if (resolved !== game.coachId) changed = true;
      newCoachId = resolved;
    }

    if (changed) {
      await upsertDocument(
        "games",
        game.id,
        {
          starters: newStarters,
          substitutes: newSubstitutes,
          participated: newParticipated,
          goals: newGoals,
          coachId: newCoachId,
        },
        { entityName: `${game.date} x ${game.opponentId}`, before: game }
      );
      updatedGamesCount += 1;
      [...newStarters, ...newSubstitutes, ...newParticipated, ...newGoals.map((g) => g.personId)]
        .filter(Boolean)
        .forEach((id) => touchedPersonIds.add(id as string));
      if (newCoachId) touchedPersonIds.add(newCoachId);
    }
  }

  const freshGames = await listCollection<Game>("games");
  for (const personId of touchedPersonIds) {
    await recalculatePersonStatistics(personId, freshGames);
  }

  return { createdCount, updatedGamesCount, affectedPeople: touchedPersonIds.size };
}
