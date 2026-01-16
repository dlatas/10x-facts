import { z } from "zod";

export const uuidSchema = z.string().uuid();

export function trimmedStringSchema(maxLen: number) {
  return z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, "Wartość nie może być pusta.")
    .refine((v) => v.length <= maxLen, `Maksymalna długość to ${maxLen}.`);
}

export const optionalTelemetryLabelSchema = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v.length <= 64, "Maksymalna długość to 64.")
  .refine((v) => /^[a-z0-9_-]+$/i.test(v), "Dozwolone znaki: a-z, 0-9, _, -.")
  .nullable()
  .optional();
