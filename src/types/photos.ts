import type { BaseDocument } from "./core";

export type PhotoType = "portrait" | "action" | "team" | "trophy" | "venue" | "document" | "other";
export type PhotoFileType = "jpg" | "jpeg" | "png" | "webp" | "gif" | "tiff";
export type PhotoLicenseType = "owned" | "authorized" | "public_domain" | "unknown";
export type PhotoAccessLevel = "public" | "restricted" | "internal";
export type PhotoIdentificationStatus = "identified" | "partial" | "unknown";

export type Photo = BaseDocument & {
  title: string;
  description?: string;
  photoType: PhotoType;
  driveFileId: string;
  fileName?: string;
  fileType: PhotoFileType;
  fileSize?: number;
  width?: number;
  height?: number;
  captureDate?: string;
  photographer?: string;
  copyrightHolder?: string;
  licenseType?: PhotoLicenseType;
  accessLevel: PhotoAccessLevel;
  personIds?: string[];
  unidentifiedPeople?: number;
  gameIds?: string[];
  competitionIds?: string[];
  editionIds?: string[];
  opponentIds?: string[];
  venueIds?: string[];
  cityIds?: string[];
  sourceIds?: string[];
  identificationStatus: PhotoIdentificationStatus;
  aiProcessed: boolean;
  aiConfidence?: number;
  historicalImportance?: number;
};
