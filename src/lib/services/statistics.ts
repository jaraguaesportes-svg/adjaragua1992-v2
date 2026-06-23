import { getDocument, listCollection, upsertDocument } from "@/lib/services/firestore";
import type { Game } from "@/types/games";
import type { Person } from "@/types/people";
import type { Competition } from "@/types/competitions";

/**
 * Recalcula as estatísticas de uma pessoa a partir da coleção games,
 * conforme Volume V 2.23 (Campos Derivados) e o Princípio da Coleção Games
 * (Volume IV 5.36): estatísticas derivam dos jogos, nunca o contrário.
 *
 * Considera apenas jogos com status "active" (arquivados não contam).
 */
export async function recalculatePersonStatistics(personId: string, allGames?: Game[]) {
  const games = allGames ?? (await listCollection<Game>("games"));
  const activeGames = games.filter((g) => g.status === "active");

  let played = 0;
  let starts = 0;
  let substitutions = 0;
  let goals = 0;
  let wins = 0;
  let draws = 0;
  let losses = 0;

  for (const game of activeGames) {
    const isStarter = game.starters?.includes(personId) ?? false;
    const isSubstitute = game.substitutes?.includes(personId) ?? false;
    const participated =
      isStarter || isSubstitute || (game.participated?.includes(personId) ?? false);

    if (!participated) continue;

    played += 1;
    if (isStarter) starts += 1;
    if (isSubstitute) substitutions += 1;

    if (game.result === "win") wins += 1;
    else if (game.result === "draw") draws += 1;
    else if (game.result === "loss") losses += 1;

    goals += (game.goals ?? []).filter((g) => g.personId === personId && g.team === "jaragua").length;
  }

  const statistics = { games: played, starts, substitutions, goals, wins, draws, losses };
  await upsertDocument("people", personId, { statistics });
  return statistics;
}

/**
 * Recalcula estatísticas de todas as pessoas envolvidas em um jogo
 * (titulares, reservas, demais participantes e autores de gol).
 * Deve ser chamado após criar, editar, arquivar ou restaurar um jogo.
 */
export async function recalculateStatisticsForGameParticipants(game: Partial<Game>) {
  const ids = new Set<string>();
  game.starters?.forEach((id) => ids.add(id));
  game.substitutes?.forEach((id) => ids.add(id));
  game.participated?.forEach((id) => ids.add(id));
  game.goals?.forEach((g) => ids.add(g.personId));

  const allGames = await listCollection<Game>("games");
  for (const personId of ids) {
    if (!personId) continue;
    await recalculatePersonStatistics(personId, allGames);
  }

  if (game.competitionId) {
    await recalculateCompetitionStatistics(game.competitionId, allGames);
  }
}

/** Recalcula a coleção games (statistics.games) de uma competição, conforme Volume V 4.20. */
export async function recalculateCompetitionStatistics(competitionId: string, allGames?: Game[]) {
  const games = allGames ?? (await listCollection<Game>("games"));
  const activeGames = games.filter((g) => g.status === "active" && g.competitionId === competitionId);
  const competition = await getDocument<Competition>("competitions", competitionId);
  const statistics = {
    editions: competition?.statistics?.editions ?? 0,
    games: activeGames.length,
    titles: competition?.statistics?.titles ?? 0,
  };
  await upsertDocument("competitions", competitionId, { statistics });
  return statistics;
}

/** Recalcula as estatísticas de todas as pessoas que aparecem em algum jogo. Use com moderação (custo O(pessoas×jogos)). */
export async function recalculateAllPeopleStatistics() {
  const [people, games] = await Promise.all([
    listCollection<Person>("people"),
    listCollection<Game>("games"),
  ]);
  for (const person of people) {
    await recalculatePersonStatistics(person.id, games);
  }
}
