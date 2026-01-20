import type { PostgrestError } from '@supabase/supabase-js';

import type { SupabaseClient } from '@/db/supabase.client';
import type {
  CreateFlashcardCommand,
  FavoriteFlashcardDto,
  FlashcardDto,
  FlashcardsListQuery,
  FlashcardSource,
  UpdateFlashcardCommand,
} from '@/types';

export class FlashcardsServiceError extends Error {
  readonly kind:
    | 'topic_not_found'
    | 'flashcard_not_found'
    | 'forbidden_source_change';

  constructor(kind: FlashcardsServiceError['kind'], message: string) {
    super(message);
    this.kind = kind;
  }
}

const FLASHCARD_DTO_FIELDS =
  'id,front,back,source,is_favorite,edited_by_user,created_at,updated_at' as const;

const FAVORITE_FLASHCARD_DTO_FIELDS = 'id,front,back,topic_id' as const;

function escapeLikePattern(value: string): string {
  // PostgREST `.or(...)` uses comma separators; sanitize to avoid breaking the filter string.
  // Also escape LIKE wildcards to reduce accidental heavy queries.
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(',', ' ')
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_');
}

function isForbiddenSourceChangeError(err: unknown): boolean {
  const e = err as Partial<PostgrestError> & { message?: unknown };
  return typeof e?.message === 'string' && e.message.includes('flashcard source is immutable');
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export async function getTopicOrThrowNotFound(args: {
  supabase: SupabaseClient;
  userId: string;
  topicId: string;
}): Promise<{ id: string }> {
  const { data, error } = await args.supabase
    .from('topics')
    .select('id')
    .eq('id', args.topicId)
    .eq('user_id', args.userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new FlashcardsServiceError('topic_not_found', 'Nie znaleziono tematu.');
  }

  return data as { id: string };
}

export async function listFlashcardsInTopic(
  args: {
    supabase: SupabaseClient;
    userId: string;
    topicId: string;
  } & Required<
    Pick<FlashcardsListQuery, 'limit' | 'offset' | 'sort' | 'order'>
  > &
    Pick<FlashcardsListQuery, 'q' | 'is_favorite' | 'source'>
): Promise<{ items: FlashcardDto[]; total: number }> {
  const rangeTo = args.offset + args.limit - 1;

  let q = args.supabase
    .from('flashcards')
    .select(FLASHCARD_DTO_FIELDS, { count: 'exact' })
    .eq('topic_id', args.topicId)
    .eq('user_id', args.userId);

  if (args.is_favorite !== undefined) {
    q = q.eq('is_favorite', args.is_favorite);
  }

  if (args.source) {
    q = q.eq('source', args.source satisfies FlashcardSource);
  }

  if (args.q) {
    const escaped = escapeLikePattern(args.q);
    const pattern = `%${escaped}%`;
    q = q.or(`front.ilike.${pattern},back.ilike.${pattern}`);
  }

  const { data, error, count } = await q
    .order(args.sort, { ascending: args.order === 'asc' })
    .range(args.offset, rangeTo);

  if (error) throw error;

  return {
    items: Array.isArray(data) ? (data as FlashcardDto[]) : [],
    total: count ?? 0,
  };
}

export async function createManualFlashcard(args: {
  supabase: SupabaseClient;
  userId: string;
  topicId: string;
  front: CreateFlashcardCommand['front'];
  back: CreateFlashcardCommand['back'];
}): Promise<FlashcardDto> {
  const insertPayload = {
    user_id: args.userId,
    topic_id: args.topicId,
    front: args.front,
    back: args.back,
    source: 'manually_created' as const,
  };

  const { data, error } = await args.supabase
    .from('flashcards')
    .insert(insertPayload)
    .select(FLASHCARD_DTO_FIELDS)
    .single();

  if (error) throw error;
  return data as FlashcardDto;
}

export async function updateFlashcard(args: {
  supabase: SupabaseClient;
  userId: string;
  flashcardId: string;
} & UpdateFlashcardCommand): Promise<FlashcardDto> {
  const { data: existing, error: existingError } = await args.supabase
    .from('flashcards')
    .select('id')
    .eq('id', args.flashcardId)
    .eq('user_id', args.userId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (!existing) {
    throw new FlashcardsServiceError(
      'flashcard_not_found',
      'Nie znaleziono fiszki.'
    );
  }

  const updatePayload: Record<string, unknown> = {};
  if (args.front !== undefined) updatePayload.front = args.front;
  if (args.back !== undefined) updatePayload.back = args.back;
  if (args.is_favorite !== undefined) updatePayload.is_favorite = args.is_favorite;

  const { data, error } = await args.supabase
    .from('flashcards')
    .update(updatePayload)
    .eq('id', args.flashcardId)
    .eq('user_id', args.userId)
    .select(FLASHCARD_DTO_FIELDS)
    .single();

  if (error) {
    if (isForbiddenSourceChangeError(error)) {
      throw new FlashcardsServiceError(
        'forbidden_source_change',
        'Nie można zmienić pola source dla fiszki.'
      );
    }
    throw error;
  }

  return data as FlashcardDto;
}

export async function deleteFlashcard(args: {
  supabase: SupabaseClient;
  userId: string;
  flashcardId: string;
}): Promise<void> {
  const { data: existing, error: existingError } = await args.supabase
    .from('flashcards')
    .select('id')
    .eq('id', args.flashcardId)
    .eq('user_id', args.userId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (!existing) {
    throw new FlashcardsServiceError(
      'flashcard_not_found',
      'Nie znaleziono fiszki.'
    );
  }

  const { error: deleteError } = await args.supabase
    .from('flashcards')
    .delete()
    .eq('id', args.flashcardId)
    .eq('user_id', args.userId);

  if (deleteError) throw deleteError;
}

export async function getRandomFavoriteFlashcards(args: {
  supabase: SupabaseClient;
  userId: string;
  limit: number;
}): Promise<FavoriteFlashcardDto[]> {
  // Preferowane: RPC (SQL) dla prawdziwego "random" bez pobierania dużych próbek.
  // Fallback: MVP losowanie w pamięci (np. gdy migracje nie są odpalone).
  const rpcLimit = Math.min(Math.max(args.limit, 1), 20);
  try {
    const { data, error } = await args.supabase.rpc(
      'get_random_favorite_flashcards',
      { p_limit: rpcLimit }
    );
    if (error) throw error;
    if (Array.isArray(data)) return data as FavoriteFlashcardDto[];
  } catch {
    // ignore -> fallback below
  }

  // MVP (bez RPC): pobierz próbkę i wylosuj w pamięci.
  const sampleSize = Math.min(200, Math.max(args.limit * 20, args.limit));

  const { data, error } = await args.supabase
    .from('flashcards')
    .select(FAVORITE_FLASHCARD_DTO_FIELDS)
    .eq('user_id', args.userId)
    .eq('is_favorite', true)
    .order('updated_at', { ascending: false })
    .limit(sampleSize);

  if (error) throw error;

  const items = Array.isArray(data) ? (data as FavoriteFlashcardDto[]) : [];
  if (items.length <= args.limit) return items;

  shuffleInPlace(items);
  return items.slice(0, args.limit);
}

