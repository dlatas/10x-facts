import { z } from 'zod';

const emailSchema = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v.length > 0, 'E-mail jest wymagany.')
  .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Podaj poprawny adres e-mail.');

const passwordSchema = z
  .string()
  .min(8, 'Hasło musi mieć co najmniej 8 znaków.');

export const authLoginCommandSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const authSignupCommandSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
