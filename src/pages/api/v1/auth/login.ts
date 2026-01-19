import type { APIContext } from 'astro';

import { json, jsonError, readJsonBody } from '@/lib/http/api';
import { authLoginCommandSchema } from '@/lib/validation/auth.schemas';
import type { OkResponse } from '@/types/common';

export const prerender = false;

function mapLoginError(status?: number | null): {
  status: number;
  message: string;
} {
  if (status === 429) {
    return {
      status: 429,
      message: 'Zbyt wiele prób. Spróbuj ponownie później.',
    };
  }
  if (status === 400 || status === 401) {
    return { status: 401, message: 'Nieprawidłowy e-mail lub hasło.' };
  }
  return { status: 500, message: 'Wystąpił błąd. Spróbuj ponownie.' };
}

function isEmailNotConfirmed(message?: string | null): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes('email') &&
    (normalized.includes('confirm') || normalized.includes('confirmation'))
  );
}

export async function POST(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  const body = await readJsonBody(context);
  if (!body.ok) return body.response;

  const parsed = authLoginCommandSchema.safeParse(body.body);
  if (!parsed.success) {
    return jsonError(400, 'Body nie przechodzi walidacji.', {
      issues: parsed.error.issues.map((i) => ({
        path: i.path,
        message: i.message,
      })),
    });
  }

  const { email, password } = parsed.data;
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user || !data.session) {
    if (isEmailNotConfirmed(error?.message ?? null)) {
      return jsonError(
        401,
        'Konto nie zostało jeszcze potwierdzone. Sprawdź e-mail i kliknij link aktywacyjny.'
      );
    }
    const mapped = mapLoginError(error?.status ?? null);
    return jsonError(mapped.status, mapped.message);
  }

  const response: OkResponse = { ok: true };
  return json(response, { status: 200 });
}
