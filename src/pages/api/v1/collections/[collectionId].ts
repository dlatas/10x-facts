import type { APIContext } from "astro";

import { json, jsonError, requireUserId } from "@/lib/http/api";
import { collectionIdParamSchema } from "@/lib/validation/collections.schemas";
import { CollectionsServiceError, deleteCollection } from "@/lib/services/collections.service";
import type { DeleteCollectionResponseDto } from "@/types";

export const prerender = false;

export async function DELETE(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  // 1) Auth
  const auth = await requireUserId(context);
  if (!auth.ok) return auth.response;

  // 2) Validate param
  const parsed = collectionIdParamSchema.safeParse(context.params.collectionId);
  if (!parsed.success) {
    return jsonError(400, "Parametr collectionId nie przechodzi walidacji.", {
      issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
    });
  }

  // 3) Delete
  try {
    await deleteCollection({ supabase, userId: auth.userId, collectionId: parsed.data });
    const response: DeleteCollectionResponseDto = { ok: true };
    return json(response, { status: 200 });
  } catch (err) {
    if (err instanceof CollectionsServiceError) {
      if (err.kind === "forbidden_system") return jsonError(403, err.message);
      if (err.kind === "not_found") return jsonError(404, err.message);
    }
    return jsonError(500, "Błąd podczas usuwania kolekcji.");
  }
}
