import {
  createClient,
  type SupabaseClient as BaseSupabaseClient,
} from '@supabase/supabase-js';

import type { Database } from '@/db/database.types.ts';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export type SupabaseClient = BaseSupabaseClient<Database>;

export function createSupabaseClient(options?: {
  authorization?: string | null;
}): SupabaseClient {
  const authorization = options?.authorization ?? null;

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authorization ? { Authorization: authorization } : {},
    },
  });
}

// Default client (anon / without user auth). Prefer request-scoped client via middleware for RLS.
export const supabaseClient = createSupabaseClient();
