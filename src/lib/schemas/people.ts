import { z } from "zod";

export const personSchema = z.object({
  nickname: z.string().min(1, "Apelido é obrigatório"),
  fullName: z.string().optional(),
  birthDate: z.string().optional(),
  deathDate: z.string().optional(),
  birthCityId: z.string().optional(),
  gender: z.enum(["male", "female"]),
  nationality: z.string().optional(),
  dominantFoot: z.enum(["right", "left", "both"]).optional(),
  roles: z.array(z.enum(["player", "coach", "referee", "director", "official"])).min(1, "Selecione ao menos um papel"),
  primaryRole: z.enum(["player", "coach", "referee", "director", "official"]),
  playerPosition: z.enum(["goalkeeper", "fixo", "ala", "pivot"]).optional(),
  cbfsRegistration: z.string().optional(),
  aliases: z.array(z.string()).optional(),
  biography: z.string().optional(),
  clubPeriods: z
    .array(
      z.object({
        yearStart: z.number().int(),
        yearEnd: z.number().int().optional(),
      })
    )
    .optional(),
  identificationStatus: z.enum(["identified", "partial", "unknown"]).optional(),
}).refine((data) => data.roles.includes(data.primaryRole), {
  message: "primaryRole deve estar incluído em roles",
  path: ["primaryRole"],
});

export type PersonInput = z.infer<typeof personSchema>;
