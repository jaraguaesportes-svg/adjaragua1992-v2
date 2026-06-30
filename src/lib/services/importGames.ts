import { createDocument, listCollection, upsertDocument } from "@/lib/services/firestore";
import { derivePersonSlug } from "@/lib/schemas/people";
import { deriveOpponentSlug } from "@/lib/schemas/opponents";
import { deriveVenueSlug } from "@/lib/schemas/venues";
import { deriveCitySlug } from "@/lib/schemas/cities";
import { deriveGameSlug, deriveResult } from "@/lib/schemas/games";
import { recalculateStatisticsForGameParticipants } from "@/lib/services/statistics";
import type { Game } from "@/types/games";

export type ImportProgress = {
  total: number;
  current: number;
  phase: string;
  errors: string[];
};

type Cache = Map<string, string>; // name -> firestoreId

/** Normaliza string vazia/null/undefined/desconhecido */
function clean(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  if (!s || s === "NaN" || s.toLowerCase().includes("desconhecido") || s.toLowerCase().includes("não obtido")) return undefined;
  return s;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Retorna ou cria uma pessoa pelo apelido */
async function getOrCreatePerson(nickname: string, cache: Cache): Promise<string> {
  const key = nickname.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  const ref = await createDocument("people", {
    nickname: nickname.trim(),
    gender: "male",
    roles: ["player"],
    primaryRole: "player",
    identificationStatus: "unknown",
    slug: derivePersonSlug(nickname.trim()),
  }, nickname.trim());
  cache.set(key, ref.id);
  return ref.id;
}

/** Retorna ou cria um treinador pelo nome */
async function getOrCreateCoach(raw: string, cache: Cache): Promise<string | undefined> {
  // Formato: "DESCONHECIDO - Treinador Desconhecido" ou "APELIDO - Nome Completo"
  const parts = raw.split(" - ");
  const nickname = parts[0]?.trim();
  if (!nickname || nickname.toUpperCase() === "DESCONHECIDO") return undefined;
  return getOrCreatePerson(nickname, cache);
}

/** Retorna ou cria uma cidade pelo nome */
async function getOrCreateCity(cityName: string, state: string, cache: Cache): Promise<string> {
  const key = cityName.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  const ref = await createDocument("cities", {
    name: cityName.trim(),
    state,
    country: "Brasil",
    countryCode: "BR",
    slug: deriveCitySlug(cityName.trim()),
  }, cityName.trim());
  cache.set(key, ref.id);
  return ref.id;
}

/** Retorna ou cria um local pelo nome */
async function getOrCreateVenue(venueName: string, cityId: string, cache: Cache): Promise<string> {
  const key = venueName.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  const ref = await createDocument("venues", {
    name: venueName.trim(),
    cityId,
    country: "Brasil",
    venueType: "gymnasium",
    active: true,
    slug: deriveVenueSlug(venueName.trim()),
  }, venueName.trim());
  cache.set(key, ref.id);
  return ref.id;
}

/** Retorna ou cria um adversário pelo nome */
async function getOrCreateOpponent(raw: string, cache: Cache): Promise<{ id: string; cityId?: string }> {
  // Formato: "CIDADE (UF) - Nome do Clube"
  const match = raw.match(/^(.+?)\s*\((\w{2})\)\s*-\s*(.+)$/);
  let clubName: string;
  let cityName: string | undefined;
  let state: string | undefined;

  if (match) {
    cityName = match[1].trim();
    state = match[2];
    clubName = match[3].trim();
  } else {
    clubName = raw.trim();
  }

  const key = clubName.toLowerCase();
  if (cache.has(key)) {
    return { id: cache.get(key)! };
  }

  // Cria cidade se necessário
  let cityId: string | undefined;
  if (cityName && state) {
    cityId = await getOrCreateCity(cityName, state, cache);
  }

  const ref = await createDocument("opponents", {
    name: clubName,
    shortName: clubName.split(" ").pop() ?? clubName,
    sport: "futsal",
    country: "Brasil",
    active: true,
    identificationStatus: "partial",
    slug: deriveOpponentSlug(clubName),
    ...(cityId ? { cityId } : {}),
  }, clubName);
  cache.set(key, ref.id);
  return { id: ref.id, cityId };
}

/** Retorna ou cria uma competição pelo nome */
async function getOrCreateCompetition(name: string, cache: Cache): Promise<string> {
  const key = name.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  const ref = await createDocument("competitions", {
    name: name.trim(),
    shortName: name.trim(),
    competitionType: "league",
    sport: "futsal",
    level: "national",
    country: "Brasil",
    active: true,
    slug: slugify(name.trim()),
  }, name.trim());
  cache.set(key, ref.id);
  return ref.id;
}

/** Parseia lista de nomes "A, B, C" e retorna array de IDs */
async function parsePersonList(raw: string | undefined, cache: Cache): Promise<string[]> {
  if (!raw) return [];
  return Promise.all(
    raw.split(",").map(s => s.trim()).filter(s => s && !s.toLowerCase().includes("desconhecido") && !s.toLowerCase().includes("não obtido")).map(name => getOrCreatePerson(name, cache))
  );
}

/** Parseia lista de gols "Nome (MM:SS), Nome2 (MM:SS)" */
async function parseGoals(raw: string | undefined, team: "jaragua" | "opponent", cache: Cache) {
  if (!raw) return [];
  const goals = [];
  for (const part of raw.split(",").map(s => s.trim())) {
    const m = part.match(/^(.+?)\s*\((\d{2}:\d{2})\)$/);
    if (!m) continue;
    const name = m[1].trim();
    const time = m[2];
    if (name.toLowerCase().includes("desconhecido")) {
      goals.push({ personId: "desconhecido", team, time });
    } else {
      const personId = await getOrCreatePerson(name, cache);
      goals.push({ personId, team, time });
    }
  }
  return goals;
}

/** Parseia "Cidade (UF), Ginásio Nome" */
async function parseLocal(raw: string | undefined, cityCache: Cache, venueCache: Cache): Promise<{ cityId?: string; venueId?: string }> {
  if (!raw) return {};
  const parts = raw.split(",").map(s => s.trim());
  if (parts.length < 1) return {};

  // Primeira parte: "Cidade (UF)"
  const cityMatch = parts[0].match(/^(.+?)\s*\((\w{2})\)$/);
  if (!cityMatch) return {};
  const cityName = cityMatch[1].trim();
  const state = cityMatch[2];
  const cityId = await getOrCreateCity(cityName, state, cityCache);

  // Segunda parte: nome do ginásio (opcional)
  let venueId: string | undefined;
  if (parts.length >= 2 && parts[1]) {
    venueId = await getOrCreateVenue(parts[1], cityId, venueCache);
  }

  return { cityId, venueId };
}

/** Converte resultado do Excel (V/D/E/?) para schema */
function parseResult(r: string | undefined): "win" | "draw" | "loss" | undefined {
  if (!r) return undefined;
  if (r === "V") return "win";
  if (r === "D") return "loss";
  if (r === "E") return "draw";
  return undefined;
}

/** Converte MANDO (C/F) para homeAway */
function parseMando(m: string | undefined): "home" | "away" | "neutral" {
  if (m === "C") return "home";
  if (m === "F") return "away";
  return "neutral";
}

/** Formata data Excel para YYYY-MM-DD */
function formatDate(d: unknown): string | undefined {
  if (!d) return undefined;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  const s = String(d);
  // dd/mm/yyyy
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s.slice(0, 10);
}

export async function importGamesFromRows(
  rows: Record<string, unknown>[],
  onProgress: (p: ImportProgress) => void
): Promise<ImportProgress> {
  const progress: ImportProgress = { total: rows.length, current: 0, phase: "Iniciando...", errors: [] };

  const personCache: Cache = new Map();
  const cityCache: Cache = new Map();
  const venueCache: Cache = new Map();
  const opponentCache: Cache = new Map();
  const competitionCache: Cache = new Map();

  // Pre-load existing records into caches
  progress.phase = "Carregando registros existentes...";
  onProgress({ ...progress });

  const [existingPeople, existingCities, existingVenues, existingOpponents, existingCompetitions] = await Promise.all([
    listCollection<{ id: string; nickname: string }>("people"),
    listCollection<{ id: string; name: string }>("cities"),
    listCollection<{ id: string; name: string }>("venues"),
    listCollection<{ id: string; name: string }>("opponents"),
    listCollection<{ id: string; name: string }>("competitions"),
  ]);

  existingPeople.forEach(p => personCache.set(p.nickname.toLowerCase(), p.id));
  existingCities.forEach(c => cityCache.set(c.name.toLowerCase(), c.id));
  existingVenues.forEach(v => venueCache.set(v.name.toLowerCase(), v.id));
  existingOpponents.forEach(o => opponentCache.set(o.name.toLowerCase(), o.id));
  existingCompetitions.forEach(c => competitionCache.set(c.name.toLowerCase(), c.id));

  progress.phase = "Importando jogos...";
  onProgress({ ...progress });

  const allGamesForStats: Game[] = [];

  for (const row of rows) {
    progress.current += 1;
    const dateRaw = row["DATA"] ?? row["DIA"];
    const date = formatDate(dateRaw);
    if (!date) {
      progress.errors.push(`Linha ${progress.current}: data inválida, pulando.`);
      onProgress({ ...progress });
      continue;
    }

    try {
      // Adversário
      const adversarioRaw = clean(row["ADVERSÁRIO"]);
      if (!adversarioRaw) {
        progress.errors.push(`Linha ${progress.current} (${date}): adversário vazio, pulando.`);
        onProgress({ ...progress });
        continue;
      }
      const { id: opponentId } = await getOrCreateOpponent(adversarioRaw, opponentCache);

      // Placar
      const jaraguaGoals = Number(row[4196] ?? row["ADJ"]) || 0;
      const opponentGoals = Number(row[2802] ?? row["ADV"]) || 0;

      // Resultado
      const resultRaw = clean(row["?"]);
      const result = parseResult(resultRaw) ?? deriveResult(jaraguaGoals, opponentGoals);

      // Local
      const localRaw = clean(row["LOCAL"]);
      const { cityId, venueId } = localRaw
        ? await parseLocal(localRaw, cityCache, venueCache)
        : {};

      // Competição
      const compRaw = clean(row["COMPETIÇÃO"]) ?? "Desconhecida";
      const competitionId = await getOrCreateCompetition(compRaw, competitionCache);

      // Mando
      const homeAway = parseMando(clean(row["MANDO"]));

      // Pessoas
      const starters = await parsePersonList(clean(row["ADJ - INÍCIO"]), personCache);
      const substitutes = await parsePersonList(clean(row["ADJ - ENTRARAM"]), personCache);
      const participated = await parsePersonList(clean(row["ADJ - JOGARAM"]), personCache);
      const opponentStarters = await parsePersonList(clean(row["ADV - INÍCIO"]), personCache);
      const opponentSubstitutes = await parsePersonList(clean(row["ADV - ENTRARAM"]), personCache);

      // Técnicos
      const coachRaw = clean(row["ADJ - TÉCNICO"]);
      const coachId = coachRaw ? await getOrCreateCoach(coachRaw, personCache) : undefined;
      const opponentCoachRaw = clean(row["ADV - TÉCNICO"]);
      const opponentCoachId = opponentCoachRaw ? await getOrCreateCoach(opponentCoachRaw, personCache) : undefined;

      // Gols
      const adjGoals = await parseGoals(clean(row["ADJ - GOLS"]), "jaragua", personCache);
      const advGoals = await parseGoals(clean(row["ADV - GOLS"]), "opponent", personCache);
      const goals = [...adjGoals, ...advGoals];

      // Árbitros
      const referees: Array<{ name: string; country?: string }> = [];
      const ref1 = clean(row["ÁRBITRO PRINCIPAL"]);
      const ref2 = clean(row["ÁRBITRO AUXILIAR"]);
      if (ref1) referees.push({ name: ref1, country: "Brasil" });
      if (ref2) referees.push({ name: ref2, country: "Brasil" });

      // Hora
      const horaRaw = row["HORA"];
      let time: string | undefined;
      if (horaRaw && String(horaRaw) !== "00:00" && String(horaRaw) !== "0:00:00") {
        time = String(horaRaw).slice(0, 5);
      }

      // Outros campos
      const season = clean(row["ÉPOCA"]);
      const phase = clean(row["FASE"]);
      const division = clean(row["DIVISÃO"]);
      const round = clean(row["GRUPO"]);
      const notes = clean(row["OBSERVAÇÕES"]);
      const attendanceRaw = row["PÚBLICO"];
      const attendance = attendanceRaw && !isNaN(Number(attendanceRaw)) ? Number(attendanceRaw) : undefined;
      const revenueRaw = row["RENDA"];
      const revenue = revenueRaw && !isNaN(Number(revenueRaw)) ? Number(revenueRaw) : undefined;

      const slug = deriveGameSlug({
        date,
        homeAway,
        opponentId,
        jaraguaGoals,
        opponentGoals,
      });

      const payload: Record<string, unknown> = {
        date,
        slug,
        result,
        jaraguaGoals,
        opponentGoals,
        opponentId,
        competitionId,
        homeAway,
        starters: starters.filter(Boolean),
        substitutes: substitutes.filter(Boolean),
        participated: participated.filter(Boolean),
        opponentStarters: opponentStarters.filter(Boolean),
        opponentSubstitutes: opponentSubstitutes.filter(Boolean),
        goals: goals.filter(g => g.personId !== "desconhecido"),
        referees,
        ...(cityId ? { cityId } : { cityId: "" }),
        ...(venueId ? { venueId } : { venueId: "" }),
        ...(time ? { time } : {}),
        ...(phase ? { phase } : {}),
        ...(division ? { division } : {}),
        ...(round ? { round } : {}),
        ...(notes ? { notes } : {}),
        ...(attendance != null ? { attendance } : {}),
        ...(revenue != null ? { revenue } : {}),
        ...(coachId ? { coachId } : {}),
        ...(opponentCoachId ? { opponentCoachId } : {}),
        ...(season ? { season } : {}),
      };

      const ref = await createDocument("games", payload, `${date} x ${adversarioRaw}`);
      allGamesForStats.push({ id: ref.id, ...payload } as unknown as Game);

      progress.phase = `Importando jogos... (${progress.current}/${progress.total})`;
      if (progress.current % 50 === 0) onProgress({ ...progress });

    } catch (err) {
      progress.errors.push(`Linha ${progress.current} (${date}): ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Recalculate statistics for all touched entities
  progress.phase = "Recalculando estatísticas...";
  onProgress({ ...progress });

  const uniqueEntityIds = new Set<string>();
  for (const game of allGamesForStats) {
    game.starters?.forEach(id => uniqueEntityIds.add(`person:${id}`));
    game.goals?.forEach(g => uniqueEntityIds.add(`person:${g.personId}`));
    if (game.opponentId) uniqueEntityIds.add(`opponent:${game.opponentId}`);
    if (game.competitionId) uniqueEntityIds.add(`competition:${game.competitionId}`);
    if (game.editionId) uniqueEntityIds.add(`edition:${game.editionId}`);
    if (game.venueId) uniqueEntityIds.add(`venue:${game.venueId}`);
    if (game.cityId) uniqueEntityIds.add(`city:${game.cityId}`);
  }

  // Run statistics recalculation in batches
  const freshGames = await listCollection<Game>("games");
  for (const game of allGamesForStats) {
    await recalculateStatisticsForGameParticipants(game, freshGames);
  }

  progress.phase = "Concluído!";
  onProgress({ ...progress });
  return progress;
}
