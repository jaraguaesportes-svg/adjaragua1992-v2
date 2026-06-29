import type { BaseDocument } from "./core";

export type City = BaseDocument & {
  name: string;
  state: string;
  stateCode?: string;
  country: string;
  countryCode?: string;
  region?: "Norte" | "Nordeste" | "Centro-Oeste" | "Sudeste" | "Sul";
  latitude?: number;
  longitude?: number;
  population?: number;
  foundationDate?: string;
  description?: string;
  officialWebsite?: string;
  venueIds?: string[];
  opponentIds?: string[];
  birthPersonIds?: string[];
  statistics?: { games: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number };
  venueStatistics?: { venues: number };
  peopleStatistics?: { players: number; coaches: number; referees: number };
  gameStatistics?: { homeGames: number; awayGames: number; neutralGames: number };
  historicalImportance?: number;
};
