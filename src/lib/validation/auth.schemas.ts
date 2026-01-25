import { z } from 'zod';
import { EMAIL_REGEX } from '@/lib/validation/email';

export const emailSchema = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v.length > 0, 'E-mail jest wymagany.')
  .refine(
    (v) => EMAIL_REGEX.test(v),
    'Podaj poprawny adres e-mail.'
  );

export const passwordSchema = z
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

export const authForgotPasswordCommandSchema = z.object({
  email: emailSchema,
});

export const authSignupFormSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z
      .string()
      .min(1, 'Potwierdzenie hasła jest wymagane.'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Hasła nie są identyczne.',
  });

export const authResetPasswordFormSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z
      .string()
      .min(1, 'Potwierdzenie hasła jest wymagane.'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Hasła muszą być takie same.',
  });
