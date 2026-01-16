import { defineMiddleware } from 'astro:middleware';

import { createSupabaseClient } from '@/db/supabase.client.ts';

export const onRequest = defineMiddleware((context, next) => {
  const authorization = context.request.headers.get('authorization');
  context.locals.supabase = createSupabaseClient({ authorization });
  return next();
});
