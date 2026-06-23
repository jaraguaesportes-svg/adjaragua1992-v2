import { z } from "zod";

export const gameGoalSchema = z.object({
  personId: z.string().min(1, "Selecione o atleta"),
  team: z.enum(["jaragua", "opponent"]),
  time: z.string().optional(),
});

export const gameRefereeSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  country: z.string().optional(),
});

export const gameSchema = z.object({
  date: z.string().min(1, "Data é obrigatória"),
  time: z.string().optional(),
  competitionId: z.string().min(1, "Competição é obrigatória"),
  editionId: z.string().min(1, "Edição é obrigatória"),
  opponentId: z.string().min(1, "Adversário é obrigatório"),
  venueId: z.string().min(1, "Local é obrigatório"),
  cityId: z.string().min(1, "Cidade é obrigatória"),
  country: z.string().optional(),
  homeAway: z.enum(["home", "away", "neutral"]),
  phase: z.string().optional(),
  round: z.string().optional(),
  jaraguaGoals: z.number().int().min(0, "Não pode ser negativo"),
  opponentGoals: z.number().int().min(0, "Não pode ser negativo"),
  attendance: z.number().int().min(0).optional(),
  revenue: z.number().min(0).optional(),
  coachId: z.string().optional(),
  starters: z.array(z.string()).optional(),
  substitutes: z.array(z.string()).optional(),
  participated: z.array(z.string()).optional(),
  goals: z.array(gameGoalSchema).optional(),
  referees: z.array(gameRefereeSchema).optional(),
  notes: z.string().optional(),
});

export type GameInput = z.infer<typeof gameSchema>;

/** Deriva o resultado (win/draw/loss) a partir dos gols, conforme Volume V — campo derivado, não editável. */
export function deriveResult(jaraguaGoals: number, opponentGoals: number): "win" | "draw" | "loss" {
  if (jaraguaGoals > opponentGoals) return "win";
  if (jaraguaGoals < opponentGoals) return "loss";
  return "draw";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Deriva o slug oficial do jogo, conforme Volume II 3.10:
 * aaaa-mm-dd-mandante-placar-x-placar-visitante (sem prefixo "ad").
 *
 * Observação: como a coleção opponents ainda não existe nas telas, usamos o
 * próprio opponentId como nome do adversário no slug. Quando opponents existir,
 * isso deve ser substituído pelo nome/slug real do adversário.
 */
export function deriveGameSlug(params: {
  date: string;
  homeAway: "home" | "away" | "neutral";
  opponentId: string;
  jaraguaGoals: number;
  opponentGoals: number;
}): string {
  const { date, homeAway, opponentId, jaraguaGoals, opponentGoals } = params;
  const opponentSlug = slugify(opponentId);
  const isAway = homeAway === "away";
  const mandante = isAway ? opponentSlug : "jaragua";
  const visitante = isAway ? "jaragua" : opponentSlug;
  const placarMandante = isAway ? opponentGoals : jaraguaGoals;
  const placarVisitante = isAway ? jaraguaGoals : opponentGoals;
  return `${date}-${mandante}-${placarMandante}-x-${placarVisitante}-${visitante}`;
}
