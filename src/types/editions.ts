import type { BaseDocument } from "./core";

export type EditionCategory = "adult-male" | "adult-female" | "youth" | "selection";
export type ParticipationType = "official" | "friendly" | "guest";

export type Edition = BaseDocument & {
  name: string;
  shortName: string;
  year: number;
  season?: string;
  competitionId: string;
  competitionName?: string;
  category: EditionCategory;
  participationType: ParticipationType;
  startDate?: string;
  endDate?: string;
  organizer?: string;
  finalPosition?: number;
  championOpponentId?: string;
  titleWon: boolean;
  runnerUp: boolean;
  regulationSourceId?: string;
  gameIds?: string[];
  statistics?: {
    games: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
  };
  participationStatistics?: { points: number; ranking: number };
  historicalImportance?: number;
};
