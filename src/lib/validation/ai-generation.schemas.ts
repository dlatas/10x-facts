import { z } from 'zod';

import {
  optionalTelemetryLabelSchema,
  trimmedStringSchema,
  uuidSchema,
} from '@/lib/validation/common.schemas';

export const aiGenerateCommandSchema = z.object({
  topic_id: uuidSchema,
});

export const aiAcceptCommandSchema = z.object({
  topic_id: uuidSchema,
  front: trimmedStringSchema(200),
  back: trimmedStringSchema(600),
  is_random: z.boolean(),
  random_domain_label: optionalTelemetryLabelSchema,
});

export const aiRejectCommandSchema = z.object({
  topic_id: uuidSchema,
  is_random: z.boolean(),
  random_domain_label: optionalTelemetryLabelSchema,
});
