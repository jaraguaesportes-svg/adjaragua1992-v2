import { z } from "zod";

export const venueSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  officialName: z.string().optional(),
  cityId: z.string().min(1, "Cidade é obrigatória"),
  country: z.string().min(1, "País é obrigatório"),
  state: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  venueType: z.enum(["arena", "gymnasium", "stadium", "sports_center", "court"]),
  surface: z.enum(["madeira", "sintetico", "cimento", "grama"]).optional(),
  capacity: z.number().int().min(0).optional(),
  inaugurationDate: z.string().optional(),
  active: z.boolean(),
  historicalNamesText: z.string().optional(),
  description: z.string().optional(),
});

export type VenueInput = z.infer<typeof venueSchema>;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Deriva o slug do local a partir do nome (exemplo oficial: "Arena Jaraguá" -> "arena-jaragua"). */
export function deriveVenueSlug(name: string): string {
  return slugify(name);
}
