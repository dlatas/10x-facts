import { z } from 'zod';

import {
  trimmedStringSchema,
  uuidSchema,
} from '@/lib/validation/common.schemas';

const collectionsSortFieldSchema = z.enum([
  'id',
  'name',
  'system_key',
  'created_at',
  'updated_at',
]);

export const collectionsListQuerySchema = z.object({
  q: z
    .string()
    .optional()
    .transform((v) => {
      const t = (v ?? '').trim();
      return t.length > 0 ? t : undefined;
    }),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sort: collectionsSortFieldSchema.default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const createCollectionCommandSchema = z.object({
  name: trimmedStringSchema(120),
});

export const collectionIdParamSchema = uuidSchema;
