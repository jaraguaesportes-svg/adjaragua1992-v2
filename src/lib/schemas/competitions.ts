import { z } from "zod";

export const competitionSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  shortName: z.string().min(1, "Nome curto é obrigatório"),
  competitionType: z.enum(["league", "cup", "supercup", "friendly", "selection"]),
  sport: z.string().min(1, "Modalidade é obrigatória"),
  level: z.enum(["international", "national", "state", "regional", "municipal"]),
  organizer: z.string().optional(),
  country: z.string().optional(),
  foundationYear: z.number().int().optional(),
  active: z.boolean(),
  officialWebsite: z.string().optional(),
  description: z.string().optional(),
  historicalNamesText: z.string().optional(),
  classification: z.enum(["principal", "secondary", "friendly"]).optional(),
  firstJaraguaParticipation: z.number().int().optional(),
});

export type CompetitionInput = z.infer<typeof competitionSchema>;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Deriva o slug da competição a partir do nome principal (Volume II 3.11). */
export function deriveCompetitionSlug(name: string): string {
  return slugify(name);
}
