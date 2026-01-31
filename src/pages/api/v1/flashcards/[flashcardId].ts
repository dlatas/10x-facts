import type { APIContext } from 'astro';

import { json, jsonError, readJsonBody, requireUserId } from '@/lib/http/api';
import {
  flashcardIdParamSchema,
  updateFlashcardCommandSchema,
} from '@/lib/validation/flashcards.schemas';
import {
  deleteFlashcard,
  FlashcardsServiceError,
  updateFlashcard,
} from '@/lib/services/flashcards.service';
import type {
  DeleteFlashcardResponseDto,
  UpdateFlashcardResponseDto,
} from '@/types';

export const prerender = false;

function hasForbiddenUpdateFields(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return 'source' in b;
}

export async function PATCH(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  // 1) Auth
  const auth = await requireUserId(context);
  if (!auth.ok) return auth.response;

  // 2) Validate param
  const flashcardIdParsed = flashcardIdParamSchema.safeParse(
    context.params.flashcardId
  );
  if (!flashcardIdParsed.success) {
    return jsonError(400, 'Parametr flashcardId nie przechodzi walidacji.', {
      issues: flashcardIdParsed.error.issues.map((i) => ({
        path: i.path,
        message: i.message,
      })),
    });
  }

  // 3) Parse body + explicit forbidden fields (403)
  const body = await readJsonBody(context);
  if (!body.ok) return body.response;

  if (hasForbiddenUpdateFields(body.body)) {
    return jsonError(403, 'Nie można zmienić pola source dla fiszki.');
  }

  const parsed = updateFlashcardCommandSchema.safeParse(body.body);
  if (!parsed.success) {
    return jsonError(400, 'Body nie przechodzi walidacji.', {
      issues: parsed.error.issues.map((i) => ({
        path: i.path,
        message: i.message,
      })),
    });
  }

  // 4) Update
  try {
    const updated = await updateFlashcard({
      supabase,
      userId: auth.userId,
      flashcardId: flashcardIdParsed.data,
      ...parsed.data,
    });

    const response: UpdateFlashcardResponseDto = updated;
    return json(response, { status: 200 });
  } catch (err) {
    if (err instanceof FlashcardsServiceError) {
      if (err.kind === 'flashcard_not_found')
        return jsonError(404, err.message);
      if (err.kind === 'forbidden_source_change')
        return jsonError(403, err.message);
    }

    return jsonError(500, 'Błąd podczas aktualizacji fiszki.');
  }
}

export async function DELETE(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  // 1) Auth
  const auth = await requireUserId(context);
  if (!auth.ok) return auth.response;

  // 2) Validate param
  const flashcardIdParsed = flashcardIdParamSchema.safeParse(
    context.params.flashcardId
  );
  if (!flashcardIdParsed.success) {
    return jsonError(400, 'Parametr flashcardId nie przechodzi walidacji.', {
      issues: flashcardIdParsed.error.issues.map((i) => ({
        path: i.path,
        message: i.message,
      })),
    });
  }

  // 3) Delete
  try {
    await deleteFlashcard({
      supabase,
      userId: auth.userId,
      flashcardId: flashcardIdParsed.data,
    });

    const response: DeleteFlashcardResponseDto = { ok: true };
    return json(response, { status: 200 });
  } catch (err) {
    if (
      err instanceof FlashcardsServiceError &&
      err.kind === 'flashcard_not_found'
    ) {
      return jsonError(404, err.message);
    }

    return jsonError(500, 'Błąd podczas usuwania fiszki.');
  }
}
