import type { APIContext } from 'astro';

import { json, jsonError, readJsonBody, requireUserId } from '@/lib/http/api';
import {
  createFlashcardCommandSchema,
  flashcardsListQuerySchema,
  topicIdParamSchema,
} from '@/lib/validation/flashcards.schemas';
import {
  createManualFlashcard,
  FlashcardsServiceError,
  getTopicOrThrowNotFound,
  listFlashcardsInTopic,
} from '@/lib/services/flashcards.service';
import type {
  CreateFlashcardResponseDto,
  FlashcardsListResponseDto,
} from '@/types';

export const prerender = false;

export async function GET(context: APIContext): Promise<Response> {
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

  // 3) Ensure topic exists for user (404 if not)
  try {
    await getTopicOrThrowNotFound({
      supabase,
      userId: auth.userId,
      topicId: topicIdParsed.data,
    });
  } catch (err) {
    if (err instanceof FlashcardsServiceError && err.kind === 'topic_not_found') {
      return jsonError(404, err.message);
    }
    console.error('[GET /topics/:topicId/flashcards] getTopicOrThrowNotFound', {
      userId: auth.userId,
      topicId: topicIdParsed.data,
      err,
    });
    return jsonError(500, 'Błąd podczas pobierania tematu.');
  }

  // 4) Parse + validate query
  const url = new URL(context.request.url);
  const queryParsed = flashcardsListQuerySchema.safeParse({
    q: url.searchParams.get('q') ?? undefined,
    is_favorite: url.searchParams.get('is_favorite') ?? undefined,
    source: url.searchParams.get('source') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
    offset: url.searchParams.get('offset') ?? undefined,
    sort: url.searchParams.get('sort') ?? undefined,
    order: url.searchParams.get('order') ?? undefined,
  });

  if (!queryParsed.success) {
    return jsonError(400, 'Query nie przechodzi walidacji.', {
      issues: queryParsed.error.issues.map((i) => ({
        path: i.path,
        message: i.message,
      })),
    });
  }

  // 5) List
  try {
    const result = await listFlashcardsInTopic({
      supabase,
      userId: auth.userId,
      topicId: topicIdParsed.data,
      ...queryParsed.data,
    });

    const response: FlashcardsListResponseDto = {
      items: result.items,
      total: result.total,
    };
    return json(response, { status: 200 });
  } catch (err) {
    console.error('[GET /topics/:topicId/flashcards] listFlashcardsInTopic', {
      userId: auth.userId,
      topicId: topicIdParsed.data,
      err,
    });
    return jsonError(500, 'Błąd podczas listowania fiszek.');
  }
}

export async function POST(context: APIContext): Promise<Response> {
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

  // 3) Ensure topic exists for user (404 if not)
  try {
    await getTopicOrThrowNotFound({
      supabase,
      userId: auth.userId,
      topicId: topicIdParsed.data,
    });
  } catch (err) {
    if (err instanceof FlashcardsServiceError && err.kind === 'topic_not_found') {
      return jsonError(404, err.message);
    }
    console.error('[POST /topics/:topicId/flashcards] getTopicOrThrowNotFound', {
      userId: auth.userId,
      topicId: topicIdParsed.data,
      err,
    });
    return jsonError(500, 'Błąd podczas pobierania tematu.');
  }

  // 4) Parse + validate body
  const body = await readJsonBody(context);
  if (!body.ok) return body.response;

  const parsed = createFlashcardCommandSchema.safeParse(body.body);
  if (!parsed.success) {
    return jsonError(400, 'Body nie przechodzi walidacji.', {
      issues: parsed.error.issues.map((i) => ({
        path: i.path,
        message: i.message,
      })),
    });
  }

  // 5) Create manual flashcard
  try {
    const created = await createManualFlashcard({
      supabase,
      userId: auth.userId,
      topicId: topicIdParsed.data,
      front: parsed.data.front,
      back: parsed.data.back,
    });

    const response: CreateFlashcardResponseDto = created;
    return json(response, { status: 201 });
  } catch (err) {
    console.error('[POST /topics/:topicId/flashcards] createManualFlashcard', {
      userId: auth.userId,
      topicId: topicIdParsed.data,
      err,
    });
    return jsonError(500, 'Błąd podczas tworzenia fiszki.');
  }
}

