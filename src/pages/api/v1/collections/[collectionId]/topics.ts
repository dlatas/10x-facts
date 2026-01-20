import type { APIContext } from 'astro';

import { json, jsonError, readJsonBody, requireUserId } from '@/lib/http/api';
import {
  collectionIdParamSchema,
  createTopicCommandSchema,
  topicsListQuerySchema,
} from '@/lib/validation/topics.schemas';
import {
  createTopicInCollection,
  ensureRandomTopicForCollection,
  getCollectionOr404,
  isUniqueViolation,
  listTopicsInCollection,
  TopicsServiceError,
} from '@/lib/services/topics.service';
import type { CreateTopicResponseDto, TopicsListResponseDto } from '@/types';

export const prerender = false;

const RANDOM_COLLECTION_SYSTEM_KEY = 'random_collection';
const RANDOM_TOPIC_SYSTEM_KEY = 'random_topic';

export async function GET(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  // 1) Auth
  const auth = await requireUserId(context);
  if (!auth.ok) return auth.response;

  // 2) Validate param
  const collectionIdParsed = collectionIdParamSchema.safeParse(
    context.params.collectionId
  );
  if (!collectionIdParsed.success) {
    return jsonError(400, 'Parametr collectionId nie przechodzi walidacji.', {
      issues: collectionIdParsed.error.issues.map((i) => ({
        path: i.path,
        message: i.message,
      })),
    });
  }

  // 3) Ensure collection exists (404 if not)
  let collection: { id: string; system_key: string | null };
  try {
    collection = await getCollectionOr404({
      supabase,
      userId: auth.userId,
      collectionId: collectionIdParsed.data,
    });
  } catch (err) {
    if (
      err instanceof TopicsServiceError &&
      err.kind === 'collection_not_found'
    ) {
      return jsonError(404, err.message);
    }
    console.error(
      '[GET /collections/:collectionId/topics] getCollectionOr404',
      {
        userId: auth.userId,
        collectionId: collectionIdParsed.data,
        err,
      }
    );
    return jsonError(500, 'Błąd podczas pobierania kolekcji.');
  }

  // 4) Best-effort: ensure system "random_topic" exists for random collection
  if (collection.system_key === RANDOM_COLLECTION_SYSTEM_KEY) {
    try {
      await ensureRandomTopicForCollection({
        supabase,
        userId: auth.userId,
        collectionId: collection.id,
      });
    } catch {
      // ignore (race conditions / transient DB issues shouldn't break listing)
    }
  }

  // 5) Parse + validate query
  const url = new URL(context.request.url);
  const queryParsed = topicsListQuerySchema.safeParse({
    q: url.searchParams.get('q') ?? undefined,
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

  // 6) List topics
  try {
    const result = await listTopicsInCollection({
      supabase,
      userId: auth.userId,
      collectionId: collection.id,
      ...queryParsed.data,
    });

    // Small-effort fallback: jeśli to random collection i (np. przez chwilowy błąd)
    // temat systemowy nie pojawił się w liście, spróbuj jeszcze raz go zapewnić i
    // odśwież listę. To nie naprawia przypadków „random_topic w innej kolekcji”
    // (immutable + unikalność per-user), ale eliminuje brak przy transient errorach.
    if (
      collection.system_key === RANDOM_COLLECTION_SYSTEM_KEY &&
      !result.items.some((t) => t.system_key === RANDOM_TOPIC_SYSTEM_KEY)
    ) {
      try {
        await ensureRandomTopicForCollection({
          supabase,
          userId: auth.userId,
          collectionId: collection.id,
        });
        const retry = await listTopicsInCollection({
          supabase,
          userId: auth.userId,
          collectionId: collection.id,
          ...queryParsed.data,
        });
        result.items = retry.items;
        result.total = retry.total;
      } catch {
        // ignore
      }
    }

    const response: TopicsListResponseDto = {
      items: result.items,
      total: result.total,
    };
    return json(response, { status: 200 });
  } catch (err) {
    console.error(
      '[GET /collections/:collectionId/topics] listTopicsInCollection',
      {
        userId: auth.userId,
        collectionId: collection.id,
        err,
      }
    );
    return jsonError(500, 'Błąd podczas listowania tematów.');
  }
}

export async function POST(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  // 1) Auth
  const auth = await requireUserId(context);
  if (!auth.ok) return auth.response;

  // 2) Validate param
  const collectionIdParsed = collectionIdParamSchema.safeParse(
    context.params.collectionId
  );
  if (!collectionIdParsed.success) {
    return jsonError(400, 'Parametr collectionId nie przechodzi walidacji.', {
      issues: collectionIdParsed.error.issues.map((i) => ({
        path: i.path,
        message: i.message,
      })),
    });
  }

  // 3) Ensure collection exists (404 if not)
  try {
    await getCollectionOr404({
      supabase,
      userId: auth.userId,
      collectionId: collectionIdParsed.data,
    });
  } catch (err) {
    if (
      err instanceof TopicsServiceError &&
      err.kind === 'collection_not_found'
    ) {
      return jsonError(404, err.message);
    }
    console.error(
      '[POST /collections/:collectionId/topics] getCollectionOr404',
      {
        userId: auth.userId,
        collectionId: collectionIdParsed.data,
        err,
      }
    );
    return jsonError(500, 'Błąd podczas pobierania kolekcji.');
  }

  // 4) Parse + validate body
  const body = await readJsonBody(context);
  if (!body.ok) return body.response;

  const parsed = createTopicCommandSchema.safeParse(body.body);
  if (!parsed.success) {
    return jsonError(400, 'Body nie przechodzi walidacji.', {
      issues: parsed.error.issues.map((i) => ({
        path: i.path,
        message: i.message,
      })),
    });
  }

  // 5) Create
  try {
    const created = await createTopicInCollection({
      supabase,
      userId: auth.userId,
      collectionId: collectionIdParsed.data,
      name: parsed.data.name,
      description: parsed.data.description,
    });
    const response: CreateTopicResponseDto = created;
    return json(response, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return jsonError(409, 'Temat o tej nazwie już istnieje w tej kolekcji.');
    }
    console.error(
      '[POST /collections/:collectionId/topics] createTopicInCollection',
      {
        userId: auth.userId,
        collectionId: collectionIdParsed.data,
        err,
      }
    );
    return jsonError(500, 'Błąd podczas tworzenia tematu.');
  }
}
