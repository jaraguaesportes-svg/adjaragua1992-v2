import type { BaseDocument } from "./core";

export type SourceType = "match_report" | "regulation" | "news" | "official_document" | "book" | "magazine" | "website" | "interview" | "other";
export type SourceAuthority = "official" | "primary" | "secondary" | "oral";
export type FileType = "pdf" | "jpg" | "png" | "webp" | "docx" | "xlsx" | "html" | "url";
export type AccessLevel = "public" | "restricted" | "internal";
export type ExtractionStatus = "not_processed" | "partial" | "processed" | "reviewed";

export type Source = BaseDocument & {
  title: string;
  sourceType: SourceType;
  subtype?: string;
  description?: string;
  publicationDate?: string;
  author?: string;
  publisher?: string;
  sourceAuthority: SourceAuthority;
  fileType: FileType;
  driveFileId?: string;
  fileName?: string;
  fileSize?: number;
  checksum?: string;
  externalUrl?: string;
  accessLevel: AccessLevel;
  relatedGameIds?: string[];
  relatedPersonIds?: string[];
  relatedCompetitionIds?: string[];
  relatedEditionIds?: string[];
  relatedOpponentIds?: string[];
  relatedVenueIds?: string[];
  relatedCityIds?: string[];
  extractionStatus: ExtractionStatus;
  aiProcessed: boolean;
  aiConfidence?: number;
  historicalImportance?: number;
};
