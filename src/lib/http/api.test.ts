import { describe, expect, it, vi } from 'vitest';

import { getBearerToken, jsonError, requireUserId } from '@/lib/http/api';

describe('lib/http/api', () => {
  describe('getBearerToken', () => {
    it('returns null when header missing', () => {
      const req = new Request('http://example.com');
      expect(getBearerToken(req)).toBeNull();
    });

    it('parses Bearer token case-insensitively', () => {
      const req = new Request('http://example.com', {
        headers: { authorization: 'bearer abc' },
      });
      expect(getBearerToken(req)).toBe('abc');
    });

    it('returns null for non-bearer scheme', () => {
      const req = new Request('http://example.com', {
        headers: { authorization: 'Token abc' },
      });
      expect(getBearerToken(req)).toBeNull();
    });

    it('trims and supports tokens with spaces', () => {
      const req = new Request('http://example.com', {
        headers: { authorization: 'Bearer   abc def   ' },
      });
      expect(getBearerToken(req)).toBe('abc def');
    });

    it('returns null for empty token', () => {
      const req = new Request('http://example.com', {
        headers: { authorization: 'Bearer   ' },
      });
      expect(getBearerToken(req)).toBeNull();
    });
  });

  describe('jsonError', () => {
    it('returns json with error.message and status', async () => {
      const res = jsonError(400, 'Query nie przechodzi walidacji.', {
        issues: [{ message: 'x' }],
      });
      expect(res.status).toBe(400);
      expect(res.headers.get('Content-Type')).toContain('application/json');

      const body = (await res.json()) as any;
      expect(body).toEqual({
        error: {
          message: 'Query nie przechodzi walidacji.',
          issues: [{ message: 'x' }],
        },
      });
    });
  });

  describe('requireUserId', () => {
    it('uses bearer token when present', async () => {
      const getUser = vi.fn().mockResolvedValue({
        data: { user: { id: 'u1' } },
        error: null,
      });

      const context: any = {
        request: new Request('http://example.com', {
          headers: { authorization: 'Bearer token123' },
        }),
        locals: {
          supabase: { auth: { getUser } },
        },
      };

      const result = await requireUserId(context);
      expect(getUser).toHaveBeenCalledWith('token123');
      expect(result).toEqual({ ok: true, userId: 'u1' });
    });

    it('returns 401 when bearer token invalid', async () => {
      const getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: new Error('invalid token'),
      });

      const context: any = {
        request: new Request('http://example.com', {
          headers: { authorization: 'Bearer bad' },
        }),
        locals: { supabase: { auth: { getUser } } },
      };

      const result = await requireUserId(context);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(401);
        const json = (await result.response.json()) as any;
        expect(json?.error?.message).toBe('Nieprawidłowy lub wygasły token.');
      }
    });

    it('falls back to session when no authorization header', async () => {
      const getUser = vi.fn().mockResolvedValue({
        data: { user: { id: 'u2' } },
        error: null,
      });

      const context: any = {
        request: new Request('http://example.com'),
        locals: { supabase: { auth: { getUser } } },
      };

      const result = await requireUserId(context);
      expect(getUser).toHaveBeenCalledWith();
      expect(result).toEqual({ ok: true, userId: 'u2' });
    });

    it('returns 401 when no session', async () => {
      const getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: new Error('no session'),
      });

      const context: any = {
        request: new Request('http://example.com'),
        locals: { supabase: { auth: { getUser } } },
      };

      const result = await requireUserId(context);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(401);
        const json = (await result.response.json()) as any;
        expect(json?.error?.message).toBe('Brak aktywnej sesji.');
      }
    });
  });
});
