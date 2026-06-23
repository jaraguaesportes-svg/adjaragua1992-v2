import { z } from "zod";

export const gameSchema = z.object({
  date: z.string().min(1),
  time: z.string().optional(),
  competitionId: z.string().min(1),
  editionId: z.string().min(1),
  opponentId: z.string().min(1),
  venueId: z.string().min(1),
  cityId: z.string().min(1),
  homeAway: z.enum(["home", "away", "neutral"]),
  jaraguaGoals: z.number().int().min(0),
  opponentGoals: z.number().int().min(0),
});

export type GameInput = z.infer<typeof gameSchema>;
