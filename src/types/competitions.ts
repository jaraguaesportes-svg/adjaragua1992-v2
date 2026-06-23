import type { BaseDocument } from "./core";

export type CompetitionType = "league" | "cup" | "supercup" | "friendly" | "selection";
export type CompetitionLevel = "international" | "national" | "state" | "regional" | "municipal";
export type CompetitionClassification = "principal" | "secondary" | "friendly";

export type Competition = BaseDocument & {
  name: string;
  shortName: string;
  competitionType: CompetitionType;
  sport: string;
  level: CompetitionLevel;
  organizer?: string;
  country?: string;
  foundationYear?: number;
  lastEditionYear?: number;
  active: boolean;
  officialWebsite?: string;
  description?: string;
  historicalNames?: string[];
  editionIds?: string[];
  gameIds?: string[];
  classification?: CompetitionClassification;
  firstJaraguaParticipation?: number;
  statistics?: { editions: number; games: number; titles: number };
  relevanceWeight?: number;
};
