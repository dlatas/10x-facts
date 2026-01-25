import type { APIContext } from 'astro';

import { createSupabaseServerClient } from '@/db/supabase.client';
import { json, jsonError } from '@/lib/http/api';
import type { OkResponse } from '@/types/common';

export const prerender = false;

export async function POST(context: APIContext): Promise<Response> {
  // Używamy klienta SSR (cookie-aware), żeby `signOut()` mógł wyczyścić cookies
  // przez `Set-Cookie` w odpowiedzi. Klient z samym `Authorization` tego nie zrobi.
  const supabase = createSupabaseServerClient({
    cookies: context.cookies,
    headers: context.request.headers,
  });

  const { error } = await supabase.auth.signOut();
  if (error) {
    return jsonError(500, 'Nie udało się wylogować. Spróbuj ponownie.');
  }

  const response: OkResponse = { ok: true };
  return json(response, { status: 200 });
}
