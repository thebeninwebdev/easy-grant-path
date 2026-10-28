import { z } from "zod";
export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.");
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters.").max(128, "Password must be at most 128 characters.");
export const strongPasswordSchema = passwordSchema.regex(/[A-Za-z]/, "Password must include a letter.").regex(/\d/, "Password must include a number.").regex(/[^A-Za-z0-9]/, "Password must include a special character.");
export const registerSchema = z.object({ name: z.string().trim().min(2, "Full name must be at least 2 characters.").max(100, "Full name must be at most 100 characters."), email: emailSchema, password: strongPasswordSchema, confirmPassword: z.string() }).refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });
export const loginSchema = z.object({ email: emailSchema, password: passwordSchema });
export const forgotPasswordSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({ password: strongPasswordSchema, confirmPassword: z.string() }).refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });
