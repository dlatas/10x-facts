import type { APIContext } from 'astro';

import { json, jsonError, readJsonBody } from '@/lib/http/api';
import { authSignupCommandSchema } from '@/lib/validation/auth.schemas';
import type { OkResponse } from '@/types/common';

export const prerender = false;

interface SignupResponse extends OkResponse {
  requiresEmailConfirmation: boolean;
}

function mapSignupError(error?: {
  status?: number | null;
  message?: string | null;
}): { status: number; message: string } {
  const status = error?.status ?? null;
  const message = (error?.message ?? '').toLowerCase();

  if (status === 429) {
    return {
      status: 429,
      message: 'Zbyt wiele prób. Spróbuj ponownie później.',
    };
  }

  if (status === 400 || status === 422) {
    if (message.includes('already') || message.includes('exists')) {
      return {
        status: 409,
        message: 'Konto z tym adresem e-mail już istnieje.',
      };
    }
    return { status: 400, message: 'Nie udało się utworzyć konta.' };
  }

  return { status: 500, message: 'Wystąpił błąd. Spróbuj ponownie.' };
}

export async function POST(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  const body = await readJsonBody(context);
  if (!body.ok) return body.response;

  const parsed = authSignupCommandSchema.safeParse(body.body);
  if (!parsed.success) {
    return jsonError(400, 'Body nie przechodzi walidacji.', {
      issues: parsed.error.issues.map((i) => ({
        path: i.path,
        message: i.message,
      })),
    });
  }

  const { email, password } = parsed.data;
  const emailRedirectTo = new URL('/auth/callback', context.url).toString();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo },
  });

  if (error || !data.user) {
    const mapped = mapSignupError(error ?? undefined);
    return jsonError(mapped.status, mapped.message);
  }

  const response: SignupResponse = {
    ok: true,
    requiresEmailConfirmation: !data.session,
  };
  return json(response, { status: 200 });
}
