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

class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getDefaultMockFlag(): boolean {
  // Domyślnie mock=TRUE, bo backend dla auth może jeszcze nie istnieć.
  const v = import.meta.env.PUBLIC_AUTH_API_MOCK;
  if (typeof v !== 'string' || v.length === 0) return true;
  return v !== 'false';
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson<T>(args: {
  url: string;
  method?: 'GET' | 'POST';
  body?: unknown;
}): Promise<T> {
  const res = await fetch(args.url, {
    method: args.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: args.body ? JSON.stringify(args.body) : undefined,
  });

  if (res.ok) return (await res.json()) as T;

  const text = await res.text().catch(() => '');
  if (res.status === 401) throw new HttpError(401, 'Brak autoryzacji (401).');
  throw new HttpError(
    res.status,
    `Błąd API (${res.status}): ${text || res.statusText}`
  );
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

    async signup(command: { email: string; password: string }): Promise<void> {
      const email = command?.email?.trim?.() ?? '';
      const password = command?.password ?? '';
      if (!email || !password) throw new Error('Podaj e-mail i hasło.');

      if (mock) {
        await sleep(750);
        // Minimalna symulacja konfliktu.
        if (email.toLowerCase().includes('exists')) {
          throw new HttpError(409, 'Konto z tym adresem e-mail już istnieje.');
        }
        return;
      }

      await fetchJson<unknown>({
        url: `${baseUrl}/api/v1/auth/signup`,
        method: 'POST',
        body: { email, password },
      });
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
