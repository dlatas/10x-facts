import type { APIContext } from 'astro';
import { OPENROUTER_MODEL, getSecret } from 'astro:env/server';

import { aiGenerateTopicDescriptionCommandSchema } from '@/lib/validation/ai-generation.schemas';
import { json, jsonError, readJsonBody, requireUserId } from '@/lib/http/api';
import { generateTopicDescriptionViaOpenRouter } from '@/lib/services/ai-generation.service';
import type { AiGenerateTopicDescriptionResponseDto } from '@/types';

export const prerender = false;

export async function POST(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  // 1) Auth
  const auth = await requireUserId(context);
  if (!auth.ok) return auth.response;

  // 2) Parse + validate body
  const body = await readJsonBody(context);
  if (!body.ok) return body.response;

  const parsed = aiGenerateTopicDescriptionCommandSchema.safeParse(body.body);
  if (!parsed.success) {
    return jsonError(400, 'Body nie przechodzi walidacji.', {
      issues: parsed.error.issues.map((i) => ({
        path: i.path,
        message: i.message,
      })),
    });
  }

  const { topic_id } = parsed.data;

  // 3) Topic authorization (RLS + explicit 404 mapping)
  const { data: topic, error: topicError } = await supabase
    .from('topics')
    .select('id,name,description,system_key')
    .eq('id', topic_id)
    .maybeSingle();

  if (topicError) return jsonError(500, 'Błąd podczas odczytu tematu.');
  if (!topic) return jsonError(404, 'Nie znaleziono tematu.');
  if (topic.system_key === 'random_topic') {
    return jsonError(403, 'Nie można generować opisu dla tematu losowego.');
  }

  // 4) Call OpenRouter
  const apiKey = getSecret('OPENROUTER_API_KEY');
  if (!apiKey) return jsonError(500, 'Brak konfiguracji OPENROUTER_API_KEY.');

  const model = OPENROUTER_MODEL;

  try {
    const generated = await generateTopicDescriptionViaOpenRouter({
      apiKey,
      model,
      topic: { name: topic.name, description: topic.description },
    });

    const response: AiGenerateTopicDescriptionResponseDto = {
      description: generated.description,
    };

    return json(response, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return jsonError(
      502,
      'Błąd dostawcy AI (OpenRouter). Spróbuj ponownie później.'
    );
  }
}
