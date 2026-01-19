import { defineMiddleware } from 'astro:middleware';

import { createSupabaseServerClient } from '@/db/supabase.client.ts';

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createSupabaseServerClient({
    cookies: context.cookies,
    headers: context.request.headers,
  });
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
