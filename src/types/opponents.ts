import type { BaseDocument } from "./core";

export type Opponent = BaseDocument & {
  name: string;
  shortName: string;
  officialName?: string;
  fantasyName?: string;
  cnpj?: string;
  sport: string;
  country: string;
  state?: string;
  cityId?: string;
  foundationDate?: string;
  extinctionDate?: string;
  active: boolean;
  historicalNames?: string[];
  predecessorId?: string;
  successorId?: string;
  officialWebsite?: string;
  colors?: string[];
  gameIds?: string[];
  identificationStatus?: "identified" | "partial" | "unknown";
  statistics?: { games: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number };
  confrontationStatistics?: {
    matches: number;
    jaraguaWins: number;
    draws: number;
    opponentWins: number;
    jaraguaGoals: number;
    opponentGoals: number;
  };
};
