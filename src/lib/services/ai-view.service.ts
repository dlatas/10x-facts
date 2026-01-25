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
import { fetchJson } from '@/lib/http/fetch-json';
import { HttpError } from '@/lib/http/http-error';

interface AiViewServiceOptions {
  baseUrl?: string;
  accessToken?: string;
}

export { HttpError };

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
