import type { AstroCookies } from 'astro';
import { createServerClient, type CookieOptionsWithName } from '@supabase/ssr';
import {
  createClient,
  type SupabaseClient as BaseSupabaseClient,
} from '@supabase/supabase-js';

import type { Database } from '@/db/database.types.ts';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export type SupabaseClient = BaseSupabaseClient<Database>;

export const cookieOptions: CookieOptionsWithName = {
  path: '/',
  secure: import.meta.env.PROD,
  httpOnly: true,
  sameSite: 'lax',
};

function parseCookieHeader(
  cookieHeader: string
): { name: string; value: string }[] {
  if (!cookieHeader) return [];
  return cookieHeader
    .split(';')
    .map((cookie) => {
      const [name, ...rest] = cookie.trim().split('=');
      return { name, value: rest.join('=') };
    })
    .filter((cookie) => cookie.name.length > 0);
}

export function createSupabaseServerClient(options: {
  headers: Headers;
  cookies: AstroCookies;
}): SupabaseClient {
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(options.headers.get('Cookie') ?? '');
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options: cookieOptions }) => {
          options.cookies.set(name, value, cookieOptions);
        });
      },
    },
  });
}

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
