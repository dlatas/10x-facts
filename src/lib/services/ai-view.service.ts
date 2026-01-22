import type {
  AiAcceptCommand,
  AiAcceptResponseDto,
  AiGenerateCommand,
  AiGenerateResponseDto,
  AiGenerateTopicDescriptionCommand,
  AiGenerateTopicDescriptionResponseDto,
  AiRejectCommand,
  AiRejectResponseDto,
  AiSkipCommand,
  AiSkipResponseDto,
} from '@/types';

interface AiViewServiceOptions {
  baseUrl?: string;
  accessToken?: string;
}

export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function fetchJson<T>(args: {
  url: string;
  method: 'POST';
  body: unknown;
  accessToken?: string;
}): Promise<T> {
  const res = await fetch(args.url, {
    method: args.method,
    headers: {
      'Content-Type': 'application/json',
      ...(args.accessToken
        ? { Authorization: `Bearer ${args.accessToken}` }
        : {}),
    },
    body: JSON.stringify(args.body),
  });

  if (res.ok) return (await res.json()) as T;

  let message = res.statusText || 'Nieznany błąd.';
  const contentType = res.headers.get('Content-Type') ?? '';

  if (contentType.includes('application/json')) {
    const payload = await res.json().catch(() => null);
    if (payload && typeof payload === 'object') {
      const errorMessage =
        (payload as { error?: { message?: string } }).error?.message ??
        (payload as { message?: string }).message;
      if (errorMessage && typeof errorMessage === 'string') {
        message = errorMessage;
      } else {
        message = JSON.stringify(payload);
      }
    }
  } else {
    const text = await res.text().catch(() => '');
    if (text) message = text;
  }

  if (res.status === 401)
    throw new HttpError(401, message || 'Brak autoryzacji (401).');
  throw new HttpError(res.status, message);
}

export function createAiViewService(opts?: AiViewServiceOptions) {
  const baseUrl = opts?.baseUrl ?? '';
  const accessToken = opts?.accessToken;

  return {
    async generate(command: AiGenerateCommand): Promise<AiGenerateResponseDto> {
      return await fetchJson<AiGenerateResponseDto>({
        url: `${baseUrl}/api/v1/ai/generate`,
        method: 'POST',
        body: command,
        accessToken,
      });
    },

    async generateTopicDescription(
      command: AiGenerateTopicDescriptionCommand
    ): Promise<AiGenerateTopicDescriptionResponseDto> {
      return await fetchJson<AiGenerateTopicDescriptionResponseDto>({
        url: `${baseUrl}/api/v1/ai/generate-topic-description`,
        method: 'POST',
        body: command,
        accessToken,
      });
    },

    async accept(command: AiAcceptCommand): Promise<AiAcceptResponseDto> {
      return await fetchJson<AiAcceptResponseDto>({
        url: `${baseUrl}/api/v1/ai/accept`,
        method: 'POST',
        body: command,
        accessToken,
      });
    },

    async reject(command: AiRejectCommand): Promise<AiRejectResponseDto> {
      return await fetchJson<AiRejectResponseDto>({
        url: `${baseUrl}/api/v1/ai/reject`,
        method: 'POST',
        body: command,
        accessToken,
      });
    },

    async skip(command: AiSkipCommand): Promise<AiSkipResponseDto> {
      return await fetchJson<AiSkipResponseDto>({
        url: `${baseUrl}/api/v1/ai/skip`,
        method: 'POST',
        body: command,
        accessToken,
      });
    },

    HttpError,
  };
}
