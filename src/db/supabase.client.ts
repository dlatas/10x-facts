import type { AstroCookies } from 'astro';
import { createServerClient, type CookieOptionsWithName } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL, getSecret } from 'astro:env/server';

import type { Database } from '@/db/database.types.ts';

export type SupabaseClient = ReturnType<typeof createClient<Database>>;

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
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(options.headers.get('Cookie') ?? '');
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options: CookieOptionsWithName;
        }[]
      ) {
        cookiesToSet.forEach(({ name, value, options: cookieOptions }) => {
          options.cookies.set(name, value, cookieOptions);
        });
      },
    },
  }) as unknown as SupabaseClient;
}

export function createSupabaseClient(options?: {
  authorization?: string | null;
}): SupabaseClient {
  const authorization = options?.authorization ?? null;
  return createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    global: {
      headers: authorization ? { Authorization: authorization } : {},
    },
  });
}

export function createSupabaseAdminClient(): SupabaseClient | null {
  const supabaseServiceRoleKey = getSecret('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseServiceRoleKey) return null;
  return createClient<Database>(SUPABASE_URL, supabaseServiceRoleKey);
}

export const supabaseClient = createSupabaseClient();
