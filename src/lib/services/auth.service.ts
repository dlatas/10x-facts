import { fetchJson } from '@/lib/http/fetch-json';
import { HttpError } from '@/lib/http/http-error';

interface AuthServiceOptions {
  /**
   * Gdy true – serwis używa mocków zamiast realnych endpointów.
   * Domyślnie włącza się, jeśli nie ustawiono PUBLIC_AUTH_API_MOCK=false.
   */
  mock?: boolean;
  /**
   * Bazowy URL API – domyślnie internal API w Astro.
   */
  baseUrl?: string;
}

function getDefaultMockFlag(): boolean {
  // Domyślnie mock=FALSE, bo backend auth jest dostępny.
  const v = import.meta.env.PUBLIC_AUTH_API_MOCK;
  if (typeof v !== 'string' || v.length === 0) return false;
  return v === 'true';
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function createAuthService(opts?: AuthServiceOptions) {
  const mock = opts?.mock ?? getDefaultMockFlag();
  const baseUrl = opts?.baseUrl ?? '';

  return {
    async login(command: { email: string; password: string }): Promise<void> {
      const email = command?.email?.trim?.() ?? '';
      const password = command?.password ?? '';
      if (!email || !password) throw new Error('Podaj e-mail i hasło.');

      if (mock) {
        await sleep(600);
        // Minimalna symulacja błędu „złe dane”.
        if (email.toLowerCase().includes('wrong')) {
          throw new HttpError(401, 'Nieprawidłowy e-mail lub hasło.');
        }
        return;
      }

      await fetchJson<unknown>({
        url: `${baseUrl}/api/v1/auth/login`,
        method: 'POST',
        body: { email, password },
      });
    },

    async logout(): Promise<void> {
      if (mock) {
        await sleep(200);
        return;
      }

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

      if (mock) {
        await sleep(750);
        // Minimalna symulacja konfliktu.
        if (email.toLowerCase().includes('exists')) {
          throw new HttpError(409, 'Konto z tym adresem e-mail już istnieje.');
        }
        return { requiresEmailConfirmation: true };
      }

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

      if (mock) {
        await sleep(650);
        // Bezpieczny UX: zawsze „ok”.
        return;
      }

      await fetchJson<unknown>({
        url: `${baseUrl}/api/v1/auth/password/reset-request`,
        method: 'POST',
        body: { email },
      });
    },

    async updatePassword(command: { password: string }): Promise<void> {
      const password = command?.password ?? '';
      if (!password) throw new Error('Podaj nowe hasło.');

      if (mock) {
        await sleep(650);
        return;
      }

      await fetchJson<unknown>({
        url: `${baseUrl}/api/v1/auth/password/update`,
        method: 'POST',
        body: { password },
      });
    },

    HttpError,
  };
}
