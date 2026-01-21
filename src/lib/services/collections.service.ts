import type { PostgrestError } from '@supabase/supabase-js';

import type { SupabaseClient } from '@/db/supabase.client';
import type { CollectionDto, CollectionsListQuery } from '@/types';

export class CollectionsServiceError extends Error {
  readonly kind: 'not_found' | 'forbidden_system' | 'forbidden_delete';

  constructor(kind: CollectionsServiceError['kind'], message: string) {
    super(message);
    this.kind = kind;
  }
}

const COLLECTION_FIELDS = 'id,name,system_key,created_at,updated_at' as const;
const RANDOM_SYSTEM_KEY = 'random_collection';

export async function ensureRandomCollectionForUser(args: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<void> {
  const { data, error } = await args.supabase
    .from('collections')
    .select('id')
    .eq('user_id', args.userId)
    .eq('system_key', RANDOM_SYSTEM_KEY)
    .maybeSingle();

  if (error) throw error;
  if (data?.id) return;

  const { error: insertError } = await args.supabase
    .from('collections')
    .insert({
      user_id: args.userId,
      name: 'Random',
      system_key: RANDOM_SYSTEM_KEY,
    });

  if (insertError) throw insertError;
}

export async function listCollections(
  args: {
    supabase: SupabaseClient;
    userId: string;
  } & Required<
    Pick<CollectionsListQuery, 'limit' | 'offset' | 'sort' | 'order'>
  > &
    Pick<CollectionsListQuery, 'q'>
): Promise<{ items: CollectionDto[]; total: number }> {
  const rangeTo = args.offset + args.limit - 1;

  let q = args.supabase
    .from('collections')
    .select(COLLECTION_FIELDS, { count: 'exact' })
    .eq('user_id', args.userId);

  if (args.q) {
    q = q.ilike('name', `%${args.q}%`);
  }

  const { data, error, count } = await q
    // Systemowe kolekcje (np. Random) zawsze na górze listy.
    // Dzięki temu dashboard z małym limitem zawsze pokaże „Random”.
    .order('system_key', { ascending: false, nullsFirst: false })
    .order(args.sort, { ascending: args.order === 'asc' })
    .range(args.offset, rangeTo);

  if (error) throw error;

  return {
    items: Array.isArray(data) ? (data as CollectionDto[]) : [],
    total: count ?? 0,
  };
}

export async function createCollection(args: {
  supabase: SupabaseClient;
  userId: string;
  name: string;
}): Promise<CollectionDto> {
  const { data, error } = await args.supabase
    .from('collections')
    .insert({
      user_id: args.userId,
      name: args.name,
      system_key: null,
    })
    .select(COLLECTION_FIELDS)
    .single();

  if (error) throw error;
  return data as CollectionDto;
}

export async function deleteCollection(args: {
  supabase: SupabaseClient;
  userId: string;
  collectionId: string;
}): Promise<void> {
  const { data: existing, error: existingError } = await args.supabase
    .from('collections')
    .select('id,system_key')
    .eq('id', args.collectionId)
    .eq('user_id', args.userId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (!existing)
    throw new CollectionsServiceError('not_found', 'Nie znaleziono kolekcji.');

  if (existing.system_key) {
    throw new CollectionsServiceError(
      'forbidden_system',
      'Nie można usunąć kolekcji systemowej.'
    );
  }

  // Uwaga: PostgREST może zwrócić sukces nawet gdy 0 wierszy spełnia filtr (np. przy RLS).
  // Najpewniej jest sprawdzić `count`, a w razie 0 rozróżnić:
  // - rekord nadal istnieje -> RLS / brak uprawnień (403)
  // - rekord zniknął -> race / już usunięty (404)
  const { error: deleteError, count } = await args.supabase
    .from('collections')
    .delete({ count: 'exact' })
    .eq('id', args.collectionId)
    .eq('user_id', args.userId);

  if (deleteError) throw deleteError;
  if (count === 1) return;

  const { data: stillThere, error: recheckError } = await args.supabase
    .from('collections')
    .select('id')
    .eq('id', args.collectionId)
    .eq('user_id', args.userId)
    .maybeSingle();
  if (recheckError) throw recheckError;

  if (stillThere) {
    throw new CollectionsServiceError(
      'forbidden_delete',
      'Brak uprawnień do usunięcia kolekcji (polityka RLS).'
    );
  }
  throw new CollectionsServiceError('not_found', 'Nie znaleziono kolekcji.');
}

export function isUniqueViolation(
  err: unknown
): err is PostgrestError & { code: '23505' } {
  const e = err as { code?: unknown };
  return e?.code === '23505';
}
