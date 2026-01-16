import type { APIContext } from 'astro';

import { aiGenerateCommandSchema } from '@/lib/validation/ai-generation.schemas';
import {
  computeDailyLimit,
  generateProposalViaOpenRouter,
  getIsRandomTopic,
  insertAiGenerationEvent,
} from '@/lib/services/ai-generation.service';
import type { AiGenerateResponseDto } from '@/types';
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

  const parsed = aiGenerateCommandSchema.safeParse(body.body);
  if (!parsed.success) {
    return jsonError(400, 'Body nie przechodzi walidacji.', {
      issues: parsed.error.issues.map((i) => ({
        path: i.path,
        message: i.message,
      })),
    });
  }

  const { topic_id } = parsed.data;

  // 3) Authorization of resource (RLS + explicit 404 mapping)
  const { data: topic, error: topicError } = await supabase
    .from('topics')
    .select('id,name,description,system_key')
    .eq('id', topic_id)
    .maybeSingle();

  if (topicError) return jsonError(500, 'Błąd podczas odczytu tematu.');
  if (!topic) return jsonError(404, 'Nie znaleziono tematu.');

  const isRandom = getIsRandomTopic(topic);

  // 4) Daily limit (counts events accepted/rejected/skipped)
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

  // 5) Call OpenRouter
  const apiKey = import.meta.env.OPENROUTER_API_KEY;
  if (!apiKey) return jsonError(500, 'Brak konfiguracji OPENROUTER_API_KEY.');

  const model = import.meta.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini';

  try {
    const proposal = await generateProposalViaOpenRouter({
      apiKey,
      model,
      topic: { name: topic.name, description: topic.description },
    });

    const response: AiGenerateResponseDto = {
      proposal: { front: proposal.front, back: proposal.back },
      limit: { remaining: limit.remaining, reset_at_utc: limit.resetAtUtc },
      is_random: isRandom,
    };

    return json(response, { status: 200 });
  } catch {
    // Best-effort: track failed generation without consuming the daily "decision" limit.
    try {
      await insertAiGenerationEvent({
        supabase,
        userId,
        topicId: topic_id,
        status: 'failed',
        isRandom,
        randomDomainLabel: null,
        model,
      });
    } catch {
      // ignore metrics failures
    }

    // In MVP: map upstream to 502 without leaking details.
    return jsonError(
      502,
      'Błąd dostawcy AI (OpenRouter). Spróbuj ponownie później.'
    );
  }
}
