import type { APIContext } from 'astro';

import { json, jsonError } from '@/lib/http/api';
import type { OkResponse } from '@/types/common';

export const prerender = false;

export async function POST(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  const { error } = await supabase.auth.signOut();
  if (error) {
    return jsonError(500, 'Nie udało się wylogować. Spróbuj ponownie.');
  }

  const response: OkResponse = { ok: true };
  return json(response, { status: 200 });
}
