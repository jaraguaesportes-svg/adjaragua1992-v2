import { z } from "zod";

export const citySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  state: z.string().min(1, "Estado é obrigatório"),
  stateCode: z.string().optional(),
  country: z.string().min(1, "País é obrigatório"),
  countryCode: z.string().optional(),
  region: z.enum(["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"]).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  population: z.number().int().min(0).optional(),
  foundationDate: z.string().optional(),
  description: z.string().optional(),
  officialWebsite: z.string().optional(),
  historicalImportance: z.number().int().min(0).max(100).optional(),
});

export type CityInput = z.infer<typeof citySchema>;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Deriva o slug da cidade a partir do nome (exemplo oficial: "Jaraguá do Sul" -> "jaragua-do-sul"). */
export function deriveCitySlug(name: string): string {
  return slugify(name);
}
