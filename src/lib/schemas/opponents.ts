import { z } from "zod";

export const opponentSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  shortName: z.string().min(1, "Nome curto é obrigatório"),
  officialName: z.string().optional(),
  fantasyName: z.string().optional(),
  cnpj: z.string().optional(),
  sport: z.string().min(1, "Modalidade é obrigatória"),
  country: z.string().min(1, "País é obrigatório"),
  state: z.string().optional(),
  cityId: z.string().optional(),
  foundationDate: z.string().optional(),
  extinctionDate: z.string().optional(),
  active: z.boolean(),
  historicalNamesText: z.string().optional(),
  predecessorId: z.string().optional(),
  successorId: z.string().optional(),
  officialWebsite: z.string().optional(),
  colorsText: z.string().optional(),
  identificationStatus: z.enum(["identified", "partial", "unknown"]).optional(),
});

export type OpponentInput = z.infer<typeof opponentSchema>;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Deriva o slug do adversário a partir da identidade institucional (Volume II 3.12). */
export function deriveOpponentSlug(name: string): string {
  return slugify(name);
}
