import { describe, expect, it, vi } from 'vitest';

import { fetchJson } from '@/lib/http/fetch-json';
import { HttpError } from '@/lib/http/http-error';

describe('lib/http/fetch-json', () => {
  it('returns parsed json on 2xx', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );

    await expect(
      fetchJson<{ ok: boolean }>({ url: 'http://x' })
    ).resolves.toEqual({ ok: true });
  });

  it('throws HttpError with extracted message from json payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Ups' } }), {
          status: 400,
          statusText: 'Bad Request',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );

    await expect(fetchJson({ url: 'http://x' })).rejects.toEqual(
      new HttpError(400, 'Ups')
    );
  });

  it('throws 401 HttpError with json message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ error: { message: 'Brak autoryzacji' } }),
          {
            status: 401,
            statusText: 'Unauthorized',
            headers: { 'Content-Type': 'application/json' },
          }
        )
      )
    );

    await expect(fetchJson({ url: 'http://x' })).rejects.toMatchObject({
      status: 401,
      message: 'Brak autoryzacji',
    });
  });

  it('adds Authorization header when accessToken provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchJson({ url: 'http://x', accessToken: 't1' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init?.headers).toMatchObject({
      Authorization: 'Bearer t1',
    });
  });
});
