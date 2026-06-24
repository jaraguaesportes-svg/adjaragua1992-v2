import { z } from "zod";

export const editionSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  shortName: z.string().min(1, "Nome curto é obrigatório"),
  year: z.number().int().min(1900, "Ano inválido"),
  season: z.string().optional(),
  competitionId: z.string().min(1, "Competição é obrigatória"),
  competitionName: z.string().optional(),
  category: z.enum(["adult-male", "adult-female", "youth", "selection"]),
  participationType: z.enum(["official", "friendly", "guest"]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  organizer: z.string().optional(),
  finalPosition: z.number().int().min(1).optional(),
  championOpponentId: z.string().optional(),
  regulationSourceId: z.string().optional(),
  historicalImportance: z.number().int().min(0).max(100).optional(),
});

export type EditionInput = z.infer<typeof editionSchema>;

/** Deriva o slug da edição: competitionId-ano (conforme exemplo oficial "lnf-2025", Volume V 5.14). */
export function deriveEditionSlug(competitionId: string, year: number): string {
  return `${competitionId}-${year}`;
}
