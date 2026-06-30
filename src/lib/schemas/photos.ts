import { z } from "zod";

export const photoSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  photoType: z.enum(["portrait", "action", "team", "trophy", "venue", "document", "other"]),
  driveFileId: z.string().min(1, "ID do Google Drive é obrigatório"),
  fileName: z.string().optional(),
  fileType: z.enum(["jpg", "jpeg", "png", "webp", "gif", "tiff"]),
  fileSize: z.number().int().min(0).optional(),
  width: z.number().int().min(0).optional(),
  height: z.number().int().min(0).optional(),
  captureDate: z.string().optional(),
  photographer: z.string().optional(),
  copyrightHolder: z.string().optional(),
  licenseType: z.enum(["owned", "authorized", "public_domain", "unknown"]).optional(),
  accessLevel: z.enum(["public", "restricted", "internal"]),
  personIdsText: z.string().optional(),
  unidentifiedPeople: z.number().int().min(0).optional(),
  gameIdsText: z.string().optional(),
  competitionIdsText: z.string().optional(),
  editionIdsText: z.string().optional(),
  opponentIdsText: z.string().optional(),
  venueIdsText: z.string().optional(),
  cityIdsText: z.string().optional(),
  sourceIdsText: z.string().optional(),
  identificationStatus: z.enum(["identified", "partial", "unknown"]),
  aiProcessed: z.boolean(),
  aiConfidence: z.number().min(0).max(100).optional(),
  historicalImportance: z.number().int().min(0).max(100).optional(),
});

export type PhotoInput = z.infer<typeof photoSchema>;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function derivePhotoSlug(title: string): string {
  return slugify(title);
}
