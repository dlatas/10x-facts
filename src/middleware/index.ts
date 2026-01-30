import { defineMiddleware } from 'astro:middleware';

import {
  createSupabaseClient,
  createSupabaseServerClient,
} from '@/db/supabase.client.ts';

export const onRequest = defineMiddleware(async (context, next) => {
  const authorizationHeader = context.request.headers.get('authorization');

  const cookieSupabase = createSupabaseServerClient({
    cookies: context.cookies,
    headers: context.request.headers,
  });

  let supabase =
    authorizationHeader && authorizationHeader.trim().length > 0
      ? createSupabaseClient({ authorization: authorizationHeader })
      : cookieSupabase;

  if (!authorizationHeader) {
    const { data } = await cookieSupabase.auth.getSession();
    const accessToken = data.session?.access_token ?? null;
    if (accessToken) {
      supabase = createSupabaseClient({
        authorization: `Bearer ${accessToken}`,
      });
    }
  }

  context.locals.supabase = supabase;

  const { data, error } = await supabase.auth.getUser();
  const user = !error ? data.user : null;

  context.locals.auth = {
    userId: user?.id ?? '',
    email: user?.email ?? null,
    isAuthenticated: Boolean(user),
  };

  return next();
});
