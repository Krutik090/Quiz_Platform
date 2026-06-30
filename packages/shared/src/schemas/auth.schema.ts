import { z } from "zod";
import { Role } from "../constants/roles";

const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128)
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a digit")
  .regex(/[^a-zA-Z0-9]/, "Password must contain a symbol");

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(128),
  mfaCode: z.string().regex(/^\d{6}$/).optional(),
});

export const registerAdminSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  name: z.string().trim().min(2).max(100),
  password: passwordSchema,
  role: z.nativeEnum(Role).default(Role.VIEWER),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

export const mfaVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

export const mfaEnrollVerifySchema = z.object({
  secret: z.string().min(16),
  code: z.string().regex(/^\d{6}$/),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterAdminInput = z.infer<typeof registerAdminSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
