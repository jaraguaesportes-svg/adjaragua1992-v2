import type { BaseDocument } from "./core";

export type VenueType = "arena" | "gymnasium" | "stadium" | "sports_center" | "court";
export type VenueSurface = "madeira" | "sintetico" | "cimento" | "grama";

export type Venue = BaseDocument & {
  name: string;
  officialName?: string;
  cityId: string;
  country: string;
  state?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  venueType: VenueType;
  surface?: VenueSurface;
  capacity?: number;
  inaugurationDate?: string;
  active: boolean;
  historicalNames?: string[];
  description?: string;
  gameIds?: string[];
  statistics?: { games: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number };
  attendanceStatistics?: { totalAttendance: number; averageAttendance: number; recordAttendance: number };
  firstGameDate?: string;
  lastGameDate?: string;
};
