import { z } from "zod";
import { AVATAR_OPTIONS } from "../types/participant.types";

export const joinEventSchema = z.object({
  joinCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6}$/, "Join code must be 6 alphanumeric characters"),
  username: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .regex(/^[a-zA-Z0-9 _.-]+$/, "Username contains invalid characters"),
  email: z.string().trim().toLowerCase().email().max(255),
  avatar: z.enum(AVATAR_OPTIONS),
});

export type JoinEventInput = z.infer<typeof joinEventSchema>;
