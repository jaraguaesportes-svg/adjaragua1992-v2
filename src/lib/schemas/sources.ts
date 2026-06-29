import { z } from "zod";

export const sourceSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  sourceType: z.enum(["match_report", "regulation", "news", "official_document", "book", "magazine", "website", "interview", "other"]),
  subtype: z.string().optional(),
  description: z.string().optional(),
  publicationDate: z.string().optional(),
  author: z.string().optional(),
  publisher: z.string().optional(),
  sourceAuthority: z.enum(["official", "primary", "secondary", "oral"]),
  fileType: z.enum(["pdf", "jpg", "png", "webp", "docx", "xlsx", "html", "url"]),
  driveFileId: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().int().min(0).optional(),
  externalUrl: z.string().optional(),
  accessLevel: z.enum(["public", "restricted", "internal"]),
  relatedGameIdsText: z.string().optional(),
  relatedPersonIdsText: z.string().optional(),
  relatedCompetitionIdsText: z.string().optional(),
  relatedEditionIdsText: z.string().optional(),
  relatedOpponentIdsText: z.string().optional(),
  relatedVenueIdsText: z.string().optional(),
  relatedCityIdsText: z.string().optional(),
  extractionStatus: z.enum(["not_processed", "partial", "processed", "reviewed"]),
  aiProcessed: z.boolean(),
  aiConfidence: z.number().min(0).max(100).optional(),
  historicalImportance: z.number().int().min(0).max(100).optional(),
});

export type SourceInput = z.infer<typeof sourceSchema>;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function deriveSourceSlug(title: string): string {
  return slugify(title);
}
