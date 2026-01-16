import type { APIContext } from 'astro';

import { json, jsonError, readJsonBody, requireUserId } from '@/lib/http/api';
import {
  collectionsListQuerySchema,
  createCollectionCommandSchema,
} from '@/lib/validation/collections.schemas';
import {
  createCollection,
  ensureRandomCollectionForUser,
  isUniqueViolation,
  listCollections,
} from '@/lib/services/collections.service';
import type {
  CollectionsListResponseDto,
  CreateCollectionResponseDto,
} from '@/types';

export const prerender = false;

export async function GET(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  // 1) Auth
  const auth = await requireUserId(context);
  if (!auth.ok) return auth.response;

  // 2) Parse + validate query
  const url = new URL(context.request.url);
  const parsed = collectionsListQuerySchema.safeParse({
    q: url.searchParams.get('q') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
    offset: url.searchParams.get('offset') ?? undefined,
    sort: url.searchParams.get('sort') ?? undefined,
    order: url.searchParams.get('order') ?? undefined,
  });

  if (!parsed.success) {
    return jsonError(400, 'Query nie przechodzi walidacji.', {
      issues: parsed.error.issues.map((i) => ({
        path: i.path,
        message: i.message,
      })),
    });
  }

  // 3) Ensure system "random" collection exists (best-effort)
  try {
    await ensureRandomCollectionForUser({ supabase, userId: auth.userId });
  } catch {
    // ignore (race conditions / transient DB issues shouldn't break listing)
  }

  // 4) List collections
  try {
    const result = await listCollections({
      supabase,
      userId: auth.userId,
      ...parsed.data,
    });

    const response: CollectionsListResponseDto = {
      items: result.items,
      total: result.total,
    };
    return json(response, { status: 200 });
  } catch {
    return jsonError(500, 'Błąd podczas listowania kolekcji.');
  }
}

export async function POST(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  // 1) Auth
  const auth = await requireUserId(context);
  if (!auth.ok) return auth.response;

  // 2) Parse + validate body
  const body = await readJsonBody(context);
  if (!body.ok) return body.response;

  const parsed = createCollectionCommandSchema.safeParse(body.body);
  if (!parsed.success) {
    return jsonError(400, 'Body nie przechodzi walidacji.', {
      issues: parsed.error.issues.map((i) => ({
        path: i.path,
        message: i.message,
      })),
    });
  }

  // 3) Create
  try {
    const created = await createCollection({
      supabase,
      userId: auth.userId,
      name: parsed.data.name,
    });
    const response: CreateCollectionResponseDto = created;
    return json(response, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return jsonError(409, 'Kolekcja o tej nazwie już istnieje.');
    }
    return jsonError(500, 'Błąd podczas tworzenia kolekcji.');
  }
}
