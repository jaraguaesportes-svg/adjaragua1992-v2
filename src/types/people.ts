import type { BaseDocument } from "./core";

export type PersonRole = "player" | "coach" | "referee" | "director" | "official";
export type PlayerPosition = "goalkeeper" | "fixo" | "ala" | "pivot";

export type Person = BaseDocument & {
  nickname: string;
  fullName?: string;
  birthDate?: string;
  deathDate?: string;
  birthCityId?: string;
  gender: "male" | "female";
  nationality?: string;
  dominantFoot?: "right" | "left" | "both";
  roles: PersonRole[];
  primaryRole: PersonRole;
  playerPosition?: PlayerPosition;
  cbfsRegistration?: string;
  aliases?: string[];
  biography?: string;
  clubPeriods?: { yearStart: number; yearEnd?: number }[];
  identificationStatus?: "identified" | "partial" | "unknown";
  statistics?: {
    games: number;
    starts: number;
    substitutions: number;
    goals: number;
    wins: number;
    draws: number;
    losses: number;
  };
};
