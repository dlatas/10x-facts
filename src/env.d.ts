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

interface ImportMetaEnv {
  // Note: this project uses Astro's `astro:env/*` for app configuration.
  // Keep this interface minimal; Astro provides default env typings out of the box.
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
