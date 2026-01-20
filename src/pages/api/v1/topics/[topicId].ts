import type { APIContext } from 'astro';

import { json, jsonError, readJsonBody, requireUserId } from '@/lib/http/api';
import {
  topicIdParamSchema,
  updateTopicDescriptionCommandSchema,
} from '@/lib/validation/topics.schemas';
import {
  deleteTopic,
  TopicsServiceError,
  updateTopicDescription,
} from '@/lib/services/topics.service';
import type { DeleteTopicResponseDto, UpdateTopicResponseDto } from '@/types';

export const prerender = false;

function hasForbiddenUpdateFields(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return 'name' in b || 'system_key' in b;
}

export async function PATCH(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  // 1) Auth
  const auth = await requireUserId(context);
  if (!auth.ok) return auth.response;

  // 2) Validate param
  const topicIdParsed = topicIdParamSchema.safeParse(context.params.topicId);
  if (!topicIdParsed.success) {
    return jsonError(400, 'Parametr topicId nie przechodzi walidacji.', {
      issues: topicIdParsed.error.issues.map((i) => ({
        path: i.path,
        message: i.message,
      })),
    });
  }

  // 3) Parse body + explicit forbidden fields (403)
  const body = await readJsonBody(context);
  if (!body.ok) return body.response;

  if (hasForbiddenUpdateFields(body.body)) {
    return jsonError(
      403,
      'Nie można zmienić pola name ani system_key dla tematu.'
    );
  }

  const parsed = updateTopicDescriptionCommandSchema.safeParse(body.body);
  if (!parsed.success) {
    return jsonError(400, 'Body nie przechodzi walidacji.', {
      issues: parsed.error.issues.map((i) => ({
        path: i.path,
        message: i.message,
      })),
    });
  }

  // 4) Update
  try {
    const updated = await updateTopicDescription({
      supabase,
      userId: auth.userId,
      topicId: topicIdParsed.data,
      description: parsed.data.description,
    });

    const response: UpdateTopicResponseDto = updated;
    return json(response, { status: 200 });
  } catch (err) {
    if (err instanceof TopicsServiceError && err.kind === 'topic_not_found') {
      return jsonError(404, err.message);
    }
    console.error('[PATCH /topics/:topicId] updateTopicDescription', {
      userId: auth.userId,
      topicId: topicIdParsed.data,
      err,
    });
    return jsonError(500, 'Błąd podczas aktualizacji tematu.');
  }
}

export async function DELETE(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  // 1) Auth
  const auth = await requireUserId(context);
  if (!auth.ok) return auth.response;

  // 2) Validate param
  const topicIdParsed = topicIdParamSchema.safeParse(context.params.topicId);
  if (!topicIdParsed.success) {
    return jsonError(400, 'Parametr topicId nie przechodzi walidacji.', {
      issues: topicIdParsed.error.issues.map((i) => ({
        path: i.path,
        message: i.message,
      })),
    });
  }

  // 3) Delete
  try {
    await deleteTopic({
      supabase,
      userId: auth.userId,
      topicId: topicIdParsed.data,
    });
    const response: DeleteTopicResponseDto = { ok: true };
    return json(response, { status: 200 });
  } catch (err) {
    if (err instanceof TopicsServiceError) {
      if (err.kind === 'forbidden_system') return jsonError(403, err.message);
      if (err.kind === 'topic_not_found') return jsonError(404, err.message);
    }
    console.error('[DELETE /topics/:topicId] deleteTopic', {
      userId: auth.userId,
      topicId: topicIdParsed.data,
      err,
    });
    return jsonError(500, 'Błąd podczas usuwania tematu.');
  }
}
