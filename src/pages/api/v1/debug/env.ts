import type { APIContext } from 'astro';

import { json, jsonError, requireUserId } from '@/lib/http/api';

export const prerender = false;

/**
 * DEV-only diagnostyka środowiska uruchomieniowego.
 * Nie zwraca sekretów (np. service role key), tylko bezpieczne flagi.
 */
export async function GET(context: APIContext): Promise<Response> {
  if (import.meta.env.PROD) {
    return jsonError(404, 'Not found.');
  }

  const auth = await requireUserId(context);
  if (!auth.ok) return auth.response;

  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const hasServiceRoleKey = Boolean(import.meta.env.SUPABASE_SERVICE_ROLE_KEY);

  return json({
    ok: true,
    env: {
      SUPABASE_URL: supabaseUrl,
      // nie ujawniamy klucza – tylko informację czy jest ustawiony
      SUPABASE_SERVICE_ROLE_KEY_SET: hasServiceRoleKey,
    },
    auth: {
      userId: auth.userId,
      locals: {
        isAuthenticated: context.locals.auth?.isAuthenticated ?? false,
        userId: context.locals.auth?.userId ?? '',
      },
    },
  });
}
