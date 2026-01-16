import type { APIContext } from 'astro';

import { aiRejectCommandSchema } from '@/lib/validation/ai-generation.schemas';
import {
  computeDailyLimit,
  getIsRandomTopic,
  insertAiGenerationEvent,
} from '@/lib/services/ai-generation.service';
import type { AiSkipResponseDto } from '@/types';
import { json, jsonError, readJsonBody, requireUserId } from '@/lib/http/api';

export const prerender = false;

export async function POST(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  // 1) Auth
  const auth = await requireUserId(context);
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  // 2) Parse + validate body
  const body = await readJsonBody(context);
  if (!body.ok) return body.response;

  const parsed = aiRejectCommandSchema.safeParse(body.body);
  if (!parsed.success) {
    return jsonError(400, 'Body nie przechodzi walidacji.', {
      issues: parsed.error.issues.map((i) => ({
        path: i.path,
        message: i.message,
      })),
    });
  }

  const { topic_id } = parsed.data;
  const randomDomainLabel = parsed.data.random_domain_label ?? null;

  // 3) Topic authorization (RLS + explicit 404 mapping)
  const { data: topic, error: topicError } = await supabase
    .from('topics')
    .select('id,system_key')
    .eq('id', topic_id)
    .maybeSingle();

  if (topicError) return jsonError(500, 'Błąd podczas odczytu tematu.');
  if (!topic) return jsonError(404, 'Nie znaleziono tematu.');

  // Telemetry: always compute server-side
  const isRandom = getIsRandomTopic(topic);

  // 4) Daily limit (hard enforcement on decision endpoints)
  const dailyLimitRaw = import.meta.env.AI_DAILY_EVENT_LIMIT;
  const dailyEventLimit = Math.max(
    1,
    Number.parseInt(dailyLimitRaw ?? '5', 10) || 5
  );

  let limit;
  try {
    limit = await computeDailyLimit({ supabase, userId, dailyEventLimit });
  } catch {
    return jsonError(500, 'Nie udało się policzyć limitu dziennego.');
  }

  if (limit.remaining <= 0) {
    return jsonError(429, 'Przekroczono dzienny limit decyzji AI.', {
      limit: { remaining: 0, reset_at_utc: limit.resetAtUtc },
    });
  }

  // 5) Insert event
  try {
    const event = await insertAiGenerationEvent({
      supabase,
      userId,
      topicId: topic_id,
      status: 'skipped',
      isRandom,
      randomDomainLabel,
    });

    const response: AiSkipResponseDto = { event_id: event.id };
    return json(response, { status: 201 });
  } catch {
    return jsonError(500, 'Nie udało się zapisać eventu AI.');
  }
}
