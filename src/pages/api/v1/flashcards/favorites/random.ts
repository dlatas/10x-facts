import type { APIContext } from 'astro';

import { json, jsonError, requireUserId } from '@/lib/http/api';
import { getRandomFavoriteFlashcards } from '@/lib/services/flashcards.service';
import { favoritesRandomQuerySchema } from '@/lib/validation/flashcards.schemas';
import type { FavoritesRandomResponseDto } from '@/types';

export const prerender = false;

export async function GET(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  // 1) Auth
  const auth = await requireUserId(context);
  if (!auth.ok) return auth.response;

  // 2) Parse + validate query
  const url = new URL(context.request.url);
  const queryParsed = favoritesRandomQuerySchema.safeParse({
    limit: url.searchParams.get('limit') ?? undefined,
  });

  if (!queryParsed.success) {
    return jsonError(400, 'Query nie przechodzi walidacji.', {
      issues: queryParsed.error.issues.map((i) => ({
        path: i.path,
        message: i.message,
      })),
    });
  }

  // 3) Random favorites (MVP: sampling in memory)
  try {
    const items = await getRandomFavoriteFlashcards({
      supabase,
      userId: auth.userId,
      limit: queryParsed.data.limit,
    });

    const response: FavoritesRandomResponseDto = { items };
    return json(response, { status: 200 });
  } catch (err) {
    return jsonError(500, 'Błąd podczas pobierania ulubionych fiszek - ' + err);
  }
}
