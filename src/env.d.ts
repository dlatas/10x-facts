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
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY?: string;
  readonly OPENROUTER_API_KEY: string;
  readonly OPENROUTER_MODEL?: string;
  readonly AI_DAILY_EVENT_LIMIT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
