import type { APIContext } from 'astro';

export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(init?.headers ?? {}),
    },
  });
}

export function jsonError(
  status: number,
  message: string,
  extra?: Record<string, unknown>
): Response {
  return json(
    {
      error: {
        message,
        ...(extra ?? {}),
      },
    },
    { status }
  );
}

export function getBearerToken(req: Request): string | null {
  const h = req.headers.get('authorization');
  if (!h) return null;
  const [scheme, ...rest] = h.split(' ');
  if (scheme?.toLowerCase() !== 'bearer') return null;
  const token = rest.join(' ').trim();
  return token.length > 0 ? token : null;
}

export async function requireUserId(
      context: APIContext
): Promise<{ ok: true; userId: string } | { ok: false; response: Response }> {
  const token = getBearerToken(context.request);
  if (token) {
    const { data: userData, error: userError } =
      await context.locals.supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return {
        ok: false,
        response: jsonError(401, 'Nieprawidłowy lub wygasły token.'),
      };
    }
    return { ok: true, userId: userData.user.id };
  }

  const { data: sessionData, error: sessionError } =
    await context.locals.supabase.auth.getUser();
  if (sessionError || !sessionData.user) {
    return {
      ok: false,
      response: jsonError(401, 'Brak aktywnej sesji.'),
    };
  }

  return { ok: true, userId: sessionData.user.id };
}

export async function readJsonBody(
  context: APIContext
): Promise<{ ok: true; body: unknown } | { ok: false; response: Response }> {
  try {
    const body = await context.request.json();
    return { ok: true, body };
  } catch {
    return {
      ok: false,
      response: jsonError(400, 'Nieprawidłowy JSON w body.'),
    };
  }
}
