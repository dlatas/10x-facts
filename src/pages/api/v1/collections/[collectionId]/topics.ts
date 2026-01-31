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

  const auth = await requireUserId(context);
  if (!auth.ok) return auth.response;

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

    return jsonError(500, 'Błąd podczas pobierania kolekcji.');
  }

  if (collection.system_key === RANDOM_COLLECTION_SYSTEM_KEY) {
    try {
      await ensureRandomTopicForCollection({
        supabase,
        userId: auth.userId,
        collectionId: collection.id,
      });
    } catch {
      // Ignoruj błędy podczas tworzenia losowego tematu
    }
  }

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

  try {
    const result = await listTopicsInCollection({
      supabase,
      userId: auth.userId,
      collectionId: collection.id,
      ...queryParsed.data,
    });

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
        // Ignoruj błędy retry - używamy oryginalnego wyniku
      }
    }

    const response: TopicsListResponseDto = {
      items: result.items,
      total: result.total,
    };
    return json(response, { status: 200 });
  } catch (err) {
    return jsonError(500, 'Błąd podczas listowania tematów - ' + err);
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
  // Dla kolekcji losowej blokujemy tworzenie dodatkowych tematów w UI i w API.
  // W kolekcji losowej powinien istnieć wyłącznie temat systemowy `random_topic`.
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

    return jsonError(500, 'Błąd podczas pobierania kolekcji.');
  }

  if (collection.system_key === RANDOM_COLLECTION_SYSTEM_KEY) {
    return jsonError(
      403,
      'Nie można tworzyć tematów w kolekcji losowej. Dostępny jest tylko temat losowy.'
    );
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
      collectionId: collection.id,
      name: parsed.data.name,
      description: parsed.data.description,
    });
    const response: CreateTopicResponseDto = created;
    return json(response, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return jsonError(409, 'Temat o tej nazwie już istnieje w tej kolekcji.');
    }

    return jsonError(500, 'Błąd podczas tworzenia tematu.');
  }
}
