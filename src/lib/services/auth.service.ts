import { fetchJson } from '@/lib/http/fetch-json';
import { HttpError } from '@/lib/http/http-error';

interface AuthServiceOptions {
  /**
   * Bazowy URL API – domyślnie internal API w Astro.
   */
  baseUrl?: string;
}

export function createAuthService(opts?: AuthServiceOptions) {
  const baseUrl = opts?.baseUrl ?? '';

  return {
    async login(command: { email: string; password: string }): Promise<void> {
      const email = command?.email?.trim?.() ?? '';
      const password = command?.password ?? '';
      if (!email || !password) throw new Error('Podaj e-mail i hasło.');

      await fetchJson<unknown>({
        url: `${baseUrl}/api/v1/auth/login`,
        method: 'POST',
        body: { email, password },
      });
    },

    async logout(): Promise<void> {
      await fetchJson<unknown>({
        url: `${baseUrl}/api/v1/auth/logout`,
        method: 'POST',
      });
    },

    async signup(command: {
      email: string;
      password: string;
    }): Promise<{ requiresEmailConfirmation: boolean }> {
      const email = command?.email?.trim?.() ?? '';
      const password = command?.password ?? '';
      if (!email || !password) throw new Error('Podaj e-mail i hasło.');

      const payload = await fetchJson<{
        requiresEmailConfirmation?: boolean;
      }>({
        url: `${baseUrl}/api/v1/auth/signup`,
        method: 'POST',
        body: { email, password },
      });
      return {
        requiresEmailConfirmation: Boolean(payload?.requiresEmailConfirmation),
      };
    },

    async requestPasswordReset(command: { email: string }): Promise<void> {
      const email = command?.email?.trim?.() ?? '';
      if (!email) throw new Error('Podaj adres e-mail.');

      await fetchJson<unknown>({
        url: `${baseUrl}/api/v1/auth/password/reset-request`,
        method: 'POST',
        body: { email },
      });
    },

    async updatePassword(command: { password: string }): Promise<void> {
      const password = command?.password ?? '';
      if (!password) throw new Error('Podaj nowe hasło.');

      await fetchJson<unknown>({
        url: `${baseUrl}/api/v1/auth/password/update`,
        method: 'POST',
        body: { password },
      });
    },

    HttpError,
  };
}
