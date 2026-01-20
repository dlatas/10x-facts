import { z } from 'zod';

import {
  trimmedStringSchema,
  uuidSchema,
} from '@/lib/validation/common.schemas';

const topicsSortFieldSchema = z.enum([
  'id',
  'name',
  'description',
  'system_key',
  'created_at',
  'updated_at',
]);

export const topicsListQuerySchema = z.object({
  q: z
    .string()
    .optional()
    .transform((v) => {
      const t = (v ?? '').trim();
      return t.length > 0 ? t : undefined;
    }),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sort: topicsSortFieldSchema.default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const createTopicCommandSchema = z
  .object({
    name: trimmedStringSchema(120),
    // MVP: dopuszczamy pusty string, ale limitujemy długość.
    description: z
      .string()
      .max(10000, 'Maksymalna długość to 10000.')
      .optional(),
  })
  .strict();

export const updateTopicDescriptionCommandSchema = z
  .object({
    description: z.string().max(10000, 'Maksymalna długość to 10000.'),
  })
  .strict();

export const collectionIdParamSchema = uuidSchema;
export const topicIdParamSchema = uuidSchema;
