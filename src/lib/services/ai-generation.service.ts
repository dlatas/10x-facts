import type { Topic } from '@/types';
import type { SupabaseClient } from '@/db/supabase.client';

export interface DailyLimit {
  remaining: number;
  resetAtUtc: string;
}

export type AiEventStatus = 'accepted' | 'rejected' | 'skipped' | 'failed';

interface OpenRouterChatCompletionResponse {
  id?: string;
  model?: string;
  choices?: {
    message?: { content?: string | null };
  }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export function toUtcDayString(dateUtc: Date): string {
  // YYYY-MM-DD in UTC
  return dateUtc.toISOString().slice(0, 10);
}

function nextUtcMidnightIso(nowUtc: Date): string {
  const d = new Date(
    Date.UTC(
      nowUtc.getUTCFullYear(),
      nowUtc.getUTCMonth(),
      nowUtc.getUTCDate() + 1,
      0,
      0,
      0,
      0
    )
  );
  return d.toISOString();
}

export async function computeDailyLimit(args: {
  supabase: SupabaseClient;
  userId: string;
  nowUtc?: Date;
  dailyEventLimit: number;
}): Promise<DailyLimit> {
  const nowUtc = args.nowUtc ?? new Date();
  const dayUtc = toUtcDayString(nowUtc);

  const { count, error } = await args.supabase
    .from('ai_generation_events')
    .select('id', { head: true, count: 'exact' })
    .eq('user_id', args.userId)
    .eq('day_utc', dayUtc)
    .in('status', ['accepted', 'rejected', 'skipped']);

  if (error) throw error;

  const used = count ?? 0;
  const remaining = Math.max(0, args.dailyEventLimit - used);

  return { remaining, resetAtUtc: nextUtcMidnightIso(nowUtc) };
}

export function getIsRandomTopic(topic: Pick<Topic, 'system_key'>): boolean {
  return topic.system_key === 'random_topic';
}

export interface RandomTopicDomain {
  /**
   * Telemetry label: a-z0-9_- (max 64)
   */
  label: string;
  /**
   * Human-friendly title used in the prompt.
   */
  title: string;
  /**
   * Description used in the prompt.
   */
  description: string;
}

export const RANDOM_TOPIC_DOMAINS: readonly RandomTopicDomain[] = [
  {
    label: 'kultura',
    title: 'Kultura',
    description:
      'Ciekawostki z kultury: sztuka, muzyka, literatura, kino; krótkie i konkretne fakty.',
  },
  {
    label: 'podroze_europa',
    title: 'Podróże po Europie',
    description:
      'Kraje i regiony Europy: położenie, stolice, języki, waluty, największe miasta, UNESCO, tradycje i kuchnia. Fakty zwięzłe, konkretne; liczby orientacyjnie („około…”), bez ocen politycznych.',
  },
  {
    label: 'geografia_swiata',
    title: 'Geografia świata',
    description:
      'Geografia fizyczna i polityczna w pigułce: kontynenty, góry, rzeki, pustynie, prądy morskie, strefy klimatyczne. Skup się na zależnościach „dlaczego tak jest”, rekordach i przykładach z życia.',
  },
  {
    label: 'napedy_auto_moto',
    title: 'Silniki i napędy (auto/moto)',
    description:
      'Praktyczne podstawy napędów: benzyna vs diesel, turbo, wtrysk, EGR/DPF/SCR, chłodzenie i smarowanie, typowe awarie i objawy. Konkretnie, bez mitów; parametry tylko orientacyjnie.',
  },
  {
    label: 'elektronika_uzytkowa',
    title: 'Elektronika użytkowa',
    description:
      'Podstawy elektroniki w praktyce: prąd/napięcie/opór, baterie i ładowanie, zasilacze, USB‑C/Power Delivery, podstawowe elementy i typowe usterki. Prosto: „co to”, „po co”, „jakie objawy”.',
  },
  {
    label: 'cyberbezpieczenstwo',
    title: 'Cyberbezpieczeństwo',
    description:
      'Bezpieczeństwo kont i urządzeń: hasła, 2FA, phishing, malware, aktualizacje, kopie zapasowe i prywatność. Fiszki mają dawać konkretne zasady i krótkie checklisty „co zrobić”, bez straszenia.',
  },
  {
    label: 'sieci_internet',
    title: 'Internet i sieci (praktycznie)',
    description:
      'Jak działa sieć: IP, DNS, DHCP, NAT, Wi‑Fi, router, porty, HTTP/HTTPS oraz prosta diagnostyka problemów (objawy + szybkie kroki). Krótko i konkretnie, bez żargonu.',
  },
  {
    label: 'programowanie_podstawy',
    title: 'Programowanie – fundamenty',
    description:
      'Podstawy niezależne od języka: zmienne, typy, pętle, funkcje, struktury danych, błędy i debugowanie. Pojęcia + krótki przykład użycia + typowa pułapka. Bez długich bloków kodu.',
  },
  {
    label: 'sql_bazy_danych',
    title: 'SQL i bazy danych',
    description:
      'Praktyczny SQL: tabele, klucze i relacje, JOIN, agregacje, indeksy oraz typowe pułapki (np. mnożenie wierszy). Przykłady „z życia” (raporty, filtry, wyszukiwanie).',
  },
  {
    label: 'historia_xx_wiek',
    title: 'Historia XX wieku',
    description:
      'Kluczowe wydarzenia XX wieku i ich konsekwencje: konflikty, przemiany społeczne, technologia, gospodarka. Skup się na faktach oraz prostych związkach przyczynowo‑skutkowych; bez polemik i ocen.',
  },
  {
    label: 'sztuka_i_kultura',
    title: 'Sztuka i kultura (przystępnie)',
    description:
      'Film, muzyka, literatura i sztuka: kierunki, twórcy, dzieła i „po czym to poznać”. Zamiast definicji: krótkie cechy stylu + jedna ciekawostka o tle i wpływie.',
  },
  {
    label: 'kuchnie_swiata',
    title: 'Kuchnie świata',
    description:
      'Kuchnie krajów i regionów: charakterystyczne składniki, techniki, dania, przyprawy i zwyczaje. Jedna fiszka = jeden konkretny produkt/danie/technika + krótka, nieoczywista ciekawostka.',
  },
  {
    label: 'zdrowie_trening',
    title: 'Zdrowie i trening',
    description:
      'Podstawy: sen, regeneracja, nawyki, trening siłowy i wytrzymałościowy, proste zasady odżywiania. Bez cudów i obietnic; jeśli liczby — zakresy i zależności indywidualne.',
  },
  {
    label: 'finanse_osobiste',
    title: 'Finanse osobiste',
    description:
      'Budżet, poduszka finansowa, procent składany, kredyt, inflacja, podstawy inwestowania i ryzyka. Neutralnie i edukacyjnie: pojęcie + krótki przykład + typowa pułapka (opłaty, RRSO).',
  },
  {
    label: 'nauka_codzienna',
    title: 'Nauka w codziennym życiu',
    description:
      'Ciekawostki naukowe „z życia”: fizyka w domu, chemia w kuchni, biologia organizmu, zjawiska pogodowe. Wyjaśnij „dlaczego” + przykład + jedna mało oczywista konsekwencja.',
  },
  {
    label: 'myslenie_krytyczne',
    title: 'Logika i myślenie krytyczne',
    description:
      'Błędy poznawcze, wnioskowanie, korelacja vs przyczynowość, ocena źródeł i argumentów. Prosto: definicja + krótki przykład + wskazówka „jak się nie złapać”, bez moralizowania.',
  },
] as const;

export function pickRandomTopicDomain(): RandomTopicDomain {
  const list = RANDOM_TOPIC_DOMAINS;
  if (!list.length) {
    return { label: 'random', title: 'Losowy', description: '' };
  }
  const idx = Math.floor(Math.random() * list.length);
  return (
    list[idx] ??
    list[0] ?? { label: 'random', title: 'Losowy', description: '' }
  );
}

export async function createAutoGeneratedFlashcard(args: {
  supabase: SupabaseClient;
  userId: string;
  topicId: string;
  front: string;
  back: string;
}): Promise<{ id: string }> {
  const { data, error } = await args.supabase
    .from('flashcards')
    .insert({
      user_id: args.userId,
      topic_id: args.topicId,
      front: args.front,
      back: args.back,
      source: 'auto_generated',
      is_favorite: false,
      edited_by_user: false,
    })
    .select('id')
    .single();

  if (error) throw error;
  if (!data?.id) throw new Error('Nie udało się utworzyć fiszki.');
  return { id: data.id };
}

export async function insertAiGenerationEvent(args: {
  supabase: SupabaseClient;
  userId: string;
  topicId: string;
  status: AiEventStatus;
  isRandom: boolean;
  randomDomainLabel: string | null;
  model?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  latencyMs?: number | null;
}): Promise<{ id: string }> {
  const { data, error } = await args.supabase
    .from('ai_generation_events')
    .insert({
      user_id: args.userId,
      topic_id: args.topicId,
      status: args.status,
      is_random: args.isRandom,
      random_domain_label: args.randomDomainLabel,
      model: args.model ?? null,
      prompt_tokens: args.promptTokens ?? null,
      completion_tokens: args.completionTokens ?? null,
      latency_ms: args.latencyMs ?? null,
    })
    .select('id')
    .single();

  if (error) throw error;
  if (!data?.id) throw new Error('Nie udało się zapisać eventu AI.');
  return { id: data.id };
}

function clampText(v: string, maxLen: number): string {
  const trimmed = v.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen).trim();
}

function clampTextAtBoundary(
  v: string,
  maxLen: number,
  opts?: { preferSentenceEnd?: boolean }
): string {
  const trimmed = v.trim();
  if (trimmed.length <= maxLen) return trimmed;

  const candidate = trimmed.slice(0, maxLen).trimEnd();
  if (!candidate) return '';

  // Prefer kończenie na granicy zdania, żeby nie ucinać w połowie.
  if (opts?.preferSentenceEnd) {
    const lastSentenceEnd = Math.max(
      candidate.lastIndexOf('.'),
      candidate.lastIndexOf('!'),
      candidate.lastIndexOf('?')
    );
    // Utnij do ostatniej kropki/wykrzyknika/pytajnika, ale tylko jeśli ma sensowną długość.
    if (lastSentenceEnd >= 80) {
      return candidate.slice(0, lastSentenceEnd + 1).trim();
    }
  }

  // Fallback: utnij na ostatniej spacji (żeby nie ucinać słowa).
  const lastSpace = candidate.lastIndexOf(' ');
  if (lastSpace >= 80) return candidate.slice(0, lastSpace).trim();

  // Ostateczny fallback.
  return candidate.trim();
}

function extractJsonObject(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function generateProposalViaOpenRouter(args: {
  apiKey: string;
  model: string;
  topic: Pick<Topic, 'name' | 'description'>;
  avoidFronts?: string[];
  timeoutMs?: number;
}): Promise<{
  front: string;
  back: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs: number;
}> {
  const controller = new AbortController();
  const timeoutMs = args.timeoutMs ?? 20_000;
  const t0 = Date.now();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  // Small, safe variability to reduce repetitive generations for the same topic.
  // Never include this value in the returned JSON (enforced by system prompt).
  const variationSeed =
    (
      globalThis.crypto as { randomUUID?: () => string } | undefined
    )?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const systemPrompt = [
    'Jesteś asystentem do tworzenia fiszek (front/back) do nauki.',
    'Zwróć WYŁĄCZNIE poprawny JSON w formacie: {"front":"...","back":"..."}.',
    'front: krótki tytuł/pytanie (max 200 znaków).',
    'back: zwięzłe wyjaśnienie (maksymalnie 600 znaków; najlepiej 350–580).',
    'back MUSI kończyć się pełnym zdaniem (kropka/wykrzyknik/pytajnik). Nie urywaj w połowie.',
    'Nie dodawaj dodatkowych pól ani tekstu poza JSON.',
    'Za każdym wywołaniem wybierz INNY aspekt/podtemat (unikaj najoczywistszej definicji).',
    'Styl odpowiedzi ma być ciekawostkowy, lekki i przystępny, a nie encyklopedyczny.',
    'Pisz prosto: krótkie zdania, bez żargonu i bez tonu akademickiego.',
    'Unikaj zwrotów: "jest to", "należy", "w związku z powyższym", "podsumowując", "cechuje się", "w kontekście".',
    'back ma mieć naturalny flow: zdanie haczyk + kilka zdań wyjaśnienia + krótka puenta/wniosek.',
    'Jeśli to pasuje do tematu, dodaj jeden konkretny smaczek (liczba, porównanie z codzienności, mało znany szczegół).',
    'Nie cytuj ani nie wypisuj żadnych identyfikatorów/seedów z treści zadania.',
  ].join('\n');

  const userPrompt = [
    `Temat: ${args.topic.name}`,
    `Opis: ${args.topic.description}`,
    '',
    ...(Array.isArray(args.avoidFronts) && args.avoidFronts.length > 0
      ? [
          'Nie powtarzaj poniższych tematów/pytań (front). Wybierz inny aspekt niż te przykłady:',
          ...args.avoidFronts
            .slice(0, 8)
            .map((f) => `- ${clampText(String(f ?? ''), 120)}`),
          '',
        ]
      : []),
    'Wybierz losowo jeden aspekt i opisz go jako ciekawostkę (nie definicję). Preferuj: zaskakujące zastosowanie, typowy mit, "dlaczego to działa", mało znany szczegół, konsekwencja w realnym życiu.',
    `Seed (nie wypisuj go w odpowiedzi): ${variationSeed}`,
    '',
    'Wygeneruj dokładnie jedną fiszkę w wymaganym formacie JSON.',
  ].join('\n');

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        'Content-Type': 'application/json',
        // Avoid any intermediary caching of POST responses.
        'Cache-Control': 'no-store',
        Pragma: 'no-cache',
        // Best-effort cache buster for gateways/proxies.
        'X-Request-Id': variationSeed,
      },
      body: JSON.stringify({
        model: args.model,
        temperature: 0.9,
        top_p: 0.95,
        // Dodatkowy bezpiecznik: ogranicz długość odpowiedzi.
        max_tokens: 250,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      // In runtimes that implement fetch caching, force no-store.
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(
        `OpenRouter error: ${res.status} ${res.statusText}${text ? `; body=${text}` : ''}`
      );
      // @ts-expect-error attach http status for mapping
      err.httpStatus = res.status;
      throw err;
    }

    const json = (await res.json()) as OpenRouterChatCompletionResponse;
    const content = json.choices?.[0]?.message?.content ?? '';

    const parsed = extractJsonObject(content);
    const obj =
      typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null;

    const rawFront = typeof obj?.front === 'string' ? obj.front : '';
    const rawBack = typeof obj?.back === 'string' ? obj.back : '';

    const front = clampText(rawFront, 200);
    let back = rawBack.trim();

    // Jeśli model przegina z długością, zrób automatyczny krok „skróć do ≤600”,
    // zamiast ucinać w połowie zdania.
    if (back.length > 600) {
      try {
        back = await shortenBackViaOpenRouter({
          apiKey: args.apiKey,
          model: args.model,
          text: back,
          timeoutMs: Math.min(12_000, timeoutMs),
        });
      } catch {
        // Best-effort: jeśli skracanie się nie uda, i tak nie ucinaj w połowie słowa/zdania.
      }
    }

    back = clampTextAtBoundary(back, 600, { preferSentenceEnd: true });

    if (!front || !back) {
      throw new Error(
        'Nie udało się sparsować odpowiedzi AI do formatu {front, back}.'
      );
    }

    return {
      front,
      back,
      model: json.model ?? args.model,
      promptTokens: json.usage?.prompt_tokens,
      completionTokens: json.usage?.completion_tokens,
      latencyMs: Date.now() - t0,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function shortenBackViaOpenRouter(args: {
  apiKey: string;
  model: string;
  text: string;
  timeoutMs: number;
}): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs);
  const variationSeed =
    (
      globalThis.crypto as { randomUUID?: () => string } | undefined
    )?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const systemPrompt = [
    'Jesteś asystentem, który skraca tekst do limitu znaków.',
    'Zwróć WYŁĄCZNIE poprawiony tekst (bez JSON, bez markdown, bez cudzysłowów, bez komentarzy).',
    'Zachowaj sens, styl ciekawostkowy i pełny kontekst.',
    'Limit: maksymalnie 600 znaków.',
    'Tekst MUSI kończyć się pełnym zdaniem (kropka/wykrzyknik/pytajnik).',
    'Nie dopisuj nowych faktów.',
  ].join('\n');

  const userPrompt = [
    'Skróć poniższy tekst do ≤600 znaków, zachowując najważniejsze informacje:',
    '',
    args.text,
    '',
    `Seed (nie wypisuj go w odpowiedzi): ${variationSeed}`,
  ].join('\n');

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        Pragma: 'no-cache',
        'X-Request-Id': variationSeed,
      },
      body: JSON.stringify({
        model: args.model,
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 260,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!res.ok) throw new Error('Nie udało się skrócić tekstu AI.');

    const json = (await res.json()) as OpenRouterChatCompletionResponse;
    const raw = json.choices?.[0]?.message?.content ?? '';
    const cleaned = stripCodeFences(raw)
      .replace(/^["']|["']$/g, '')
      .trim();
    return cleaned;
  } finally {
    clearTimeout(timeout);
  }
}

function stripCodeFences(text: string): string {
  const t = text.trim();
  if (!t.startsWith('```')) return t;
  // Remove first and last fence if present.
  const withoutFirst = t.replace(/^```[a-zA-Z0-9_-]*\s*\n?/, '');
  return withoutFirst.replace(/\n?```$/, '').trim();
}

export async function generateTopicDescriptionViaOpenRouter(args: {
  apiKey: string;
  model: string;
  topic: Pick<Topic, 'name' | 'description'>;
  timeoutMs?: number;
}): Promise<{
  description: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs: number;
}> {
  const controller = new AbortController();
  const timeoutMs = args.timeoutMs ?? 20_000;
  const t0 = Date.now();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const variationSeed =
    (
      globalThis.crypto as { randomUUID?: () => string } | undefined
    )?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const systemPrompt = [
    'Jesteś asystentem, który tworzy OPIS TEMATU do aplikacji z fiszkami.',
    'Twoim celem jest wygenerowanie tekstu, który użytkownik wklei w pole "Opis tematu", aby poprawić jakość generowania fiszek.',
    'Pisz po polsku. Styl: konkretnie i przystępnie, bez lania wody i bez tonu akademickiego.',
    'Zwróć WYŁĄCZNIE sam opis (czysty tekst), bez JSON, bez markdown, bez cudzysłowów i bez dodatkowych komentarzy.',
    'Opis ma mieć 2–6 zdań i ewentualnie krótką listę aspektów po dwukropku.',
  ].join('\n');

  const userPrompt = [
    `Nazwa tematu: ${args.topic.name}`,
    `Obecny opis (może być pusty): ${args.topic.description}`,
    '',
    'Wygeneruj propozycję opisu, która: (1) precyzuje zakres, (2) podaje przykładowe wątki/aspekty, (3) mówi jakiego stylu oczekujemy od fiszek.',
    `Seed (nie wypisuj go w odpowiedzi): ${variationSeed}`,
  ].join('\n');

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        Pragma: 'no-cache',
        'X-Request-Id': variationSeed,
      },
      body: JSON.stringify({
        model: args.model,
        temperature: 0.8,
        top_p: 0.95,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(
        `OpenRouter error: ${res.status} ${res.statusText}${text ? `; body=${text}` : ''}`
      );
      // @ts-expect-error attach http status for mapping
      err.httpStatus = res.status;
      throw err;
    }

    const json = (await res.json()) as OpenRouterChatCompletionResponse;
    const raw = json.choices?.[0]?.message?.content ?? '';
    const cleaned = clampText(
      stripCodeFences(raw).replace(/^["']|["']$/g, ''),
      2000
    );

    if (!cleaned) throw new Error('Nie udało się wygenerować opisu tematu.');

    return {
      description: cleaned,
      model: json.model ?? args.model,
      promptTokens: json.usage?.prompt_tokens,
      completionTokens: json.usage?.completion_tokens,
      latencyMs: Date.now() - t0,
    };
  } finally {
    clearTimeout(timeout);
  }
}
