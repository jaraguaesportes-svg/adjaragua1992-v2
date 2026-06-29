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
  if (game.editionId) {
    await recalculateEditionStatistics(game.editionId, allGames);
  }
  if (game.opponentId) {
    await recalculateOpponentStatistics(game.opponentId, allGames);
  }
  if (game.venueId) {
    await recalculateVenueStatistics(game.venueId, allGames);
  }
  if (game.cityId) {
    await recalculateCityStatistics(game.cityId, allGames);
  }
}

/** Recalcula statistics e confrontationStatistics do adversário, conforme Volume V 6.12/6.13. */
export async function recalculateOpponentStatistics(opponentId: string, allGames?: Game[]) {
  const games = allGames ?? (await listCollection<Game>("games"));
  const activeGames = games.filter((g) => g.status === "active" && g.opponentId === opponentId);

  const statistics = { games: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
  const confrontationStatistics = {
    matches: 0,
    jaraguaWins: 0,
    draws: 0,
    opponentWins: 0,
    jaraguaGoals: 0,
    opponentGoals: 0,
  };

  for (const g of activeGames) {
    statistics.games += 1;
    confrontationStatistics.matches += 1;
    // "statistics" representa o desempenho do adversário (visão invertida: vitória do
    // adversário é quando o Jaraguá perde, e vice-versa).
    if (g.result === "win") {
      statistics.losses += 1;
      confrontationStatistics.jaraguaWins += 1;
    } else if (g.result === "loss") {
      statistics.wins += 1;
      confrontationStatistics.opponentWins += 1;
    } else {
      statistics.draws += 1;
      confrontationStatistics.draws += 1;
    }
    statistics.goalsFor += g.opponentGoals;
    statistics.goalsAgainst += g.jaraguaGoals;
    confrontationStatistics.jaraguaGoals += g.jaraguaGoals;
    confrontationStatistics.opponentGoals += g.opponentGoals;
  }

  await upsertDocument("opponents", opponentId, { statistics, confrontationStatistics });
  return { statistics, confrontationStatistics };
}

/** Recalcula statistics, venueStatistics, peopleStatistics e gameStatistics da cidade, conforme Volume V 8.21-8.23. */
export async function recalculateCityStatistics(cityId: string, allGames?: Game[]) {
  const games = allGames ?? (await listCollection<Game>("games"));
  const activeGames = games.filter((g) => g.status === "active" && g.cityId === cityId);

  const statistics = { games: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
  const gameStatistics = { homeGames: 0, awayGames: 0, neutralGames: 0 };
  const venueIds = new Set<string>();
  const playerIds = new Set<string>();
  const coachIds = new Set<string>();

  for (const g of activeGames) {
    statistics.games += 1;
    if (g.result === "win") statistics.wins += 1;
    else if (g.result === "draw") statistics.draws += 1;
    else if (g.result === "loss") statistics.losses += 1;
    statistics.goalsFor += g.jaraguaGoals;
    statistics.goalsAgainst += g.opponentGoals;

    if (g.homeAway === "home") gameStatistics.homeGames += 1;
    else if (g.homeAway === "away") gameStatistics.awayGames += 1;
    else gameStatistics.neutralGames += 1;

    if (g.venueId) venueIds.add(g.venueId);
    g.starters?.forEach((id) => playerIds.add(id));
    g.substitutes?.forEach((id) => playerIds.add(id));
    g.participated?.forEach((id) => playerIds.add(id));
    if (g.coachId) coachIds.add(g.coachId);
  }

  const venueStatistics = { venues: venueIds.size };
  const peopleStatistics = { players: playerIds.size, coaches: coachIds.size, referees: 0 };

  await upsertDocument("cities", cityId, { statistics, venueStatistics, peopleStatistics, gameStatistics });
  return { statistics, venueStatistics, peopleStatistics, gameStatistics };
}

/** Recalcula statistics, attendanceStatistics e datas extremas do local, conforme Volume V 7.19-7.21. */
export async function recalculateVenueStatistics(venueId: string, allGames?: Game[]) {
  const games = allGames ?? (await listCollection<Game>("games"));
  const activeGames = games
    .filter((g) => g.status === "active" && g.venueId === venueId)
    .sort((a, b) => a.date.localeCompare(b.date));

  const statistics = { games: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
  let totalAttendance = 0;
  let recordAttendance = 0;
  let attendanceGamesCount = 0;

  for (const g of activeGames) {
    statistics.games += 1;
    if (g.result === "win") statistics.wins += 1;
    else if (g.result === "draw") statistics.draws += 1;
    else if (g.result === "loss") statistics.losses += 1;
    statistics.goalsFor += g.jaraguaGoals;
    statistics.goalsAgainst += g.opponentGoals;
    if (typeof g.attendance === "number") {
      totalAttendance += g.attendance;
      attendanceGamesCount += 1;
      if (g.attendance > recordAttendance) recordAttendance = g.attendance;
    }
  }

  const attendanceStatistics = {
    totalAttendance,
    averageAttendance: attendanceGamesCount > 0 ? Math.round(totalAttendance / attendanceGamesCount) : 0,
    recordAttendance,
  };

  const firstGameDate = activeGames[0]?.date;
  const lastGameDate = activeGames[activeGames.length - 1]?.date;

  await upsertDocument("venues", venueId, { statistics, attendanceStatistics, firstGameDate, lastGameDate });
  return { statistics, attendanceStatistics, firstGameDate, lastGameDate };
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

/** Recalcula statistics da edição (jogos, V-E-D, gols), conforme Volume V 5.17. */
export async function recalculateEditionStatistics(editionId: string, allGames?: Game[]) {
  const games = allGames ?? (await listCollection<Game>("games"));
  const activeGames = games.filter((g) => g.status === "active" && g.editionId === editionId);
  const statistics = activeGames.reduce(
    (acc, g) => {
      acc.games += 1;
      if (g.result === "win") acc.wins += 1;
      else if (g.result === "draw") acc.draws += 1;
      else if (g.result === "loss") acc.losses += 1;
      acc.goalsFor += g.jaraguaGoals;
      acc.goalsAgainst += g.opponentGoals;
      return acc;
    },
    { games: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 }
  );
  await upsertDocument("editions", editionId, { statistics });
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
