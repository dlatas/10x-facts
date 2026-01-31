import 'astro/client';

import type { SupabaseClient } from '@/db/supabase.client.ts';

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
      auth: {
        userId: string;
        email: string | null;
        isAuthenticated: boolean;
        isAdmin?: boolean;
      };
    }
  }
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
