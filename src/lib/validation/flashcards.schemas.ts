import { z } from 'zod';

import { trimmedStringSchema, uuidSchema } from '@/lib/validation/common.schemas';

const flashcardsSortFieldSchema = z.enum([
  'id',
  'front',
  'back',
  'source',
  'is_favorite',
  'edited_by_user',
  'created_at',
  'updated_at',
]);

const flashcardSourceSchema = z.enum(['manually_created', 'auto_generated']);

function booleanFromTrueFalseStringSchema() {
  return z.preprocess((v) => {
    if (typeof v !== 'string') return v;
    const t = v.trim().toLowerCase();
    if (t === 'true') return true;
    if (t === 'false') return false;
    return v;
  }, z.boolean());
}

export const flashcardsListQuerySchema = z.object({
  q: z
    .string()
    .optional()
    .transform((v) => {
      const t = (v ?? '').trim();
      return t.length > 0 ? t : undefined;
    })
    .refine((v) => v === undefined || v.length <= 200, {
      message: 'Maksymalna długość q to 200.',
    }),
  is_favorite: booleanFromTrueFalseStringSchema().optional(),
  source: flashcardSourceSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sort: flashcardsSortFieldSchema.default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const favoritesRandomQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

export const createFlashcardCommandSchema = z
  .object({
    front: trimmedStringSchema(200),
    back: trimmedStringSchema(600),
  })
  .strict();

export const updateFlashcardCommandSchema = z
  .object({
    front: trimmedStringSchema(200).optional(),
    back: trimmedStringSchema(600).optional(),
    is_favorite: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'Body musi zawierać przynajmniej jedno z pól: front, back, is_favorite.',
  });

export const topicIdParamSchema = uuidSchema;
export const flashcardIdParamSchema = uuidSchema;

