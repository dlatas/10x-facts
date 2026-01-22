import * as React from "react";
import { Heart } from "lucide-react";

import type { FavoriteFlashcardDto } from "@/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function FlashcardDetailsDialog(props: {
  isOpen: boolean;
  onClose: () => void;
  flashcard: FavoriteFlashcardDto | null;
  onToggleFavorite?: () => void;
  isTogglingFavorite?: boolean;
}) {
  const { isOpen, onClose, flashcard } = props;

  // Guard: dialog może być otwarty tylko jeśli mamy fiszkę.
  const open = isOpen && !!flashcard;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <DialogTitle className="min-w-0 flex-1">{flashcard?.front ?? ""}</DialogTitle>
            {props.onToggleFavorite ? (
              <Button
                variant="outline"
                size="icon"
                disabled={props.isTogglingFavorite}
                aria-label="Usuń z ulubionych"
                aria-pressed={true}
                title="Usuń z ulubionych"
                onClick={() => props.onToggleFavorite?.()}
              >
                <Heart className="fill-red-500 text-red-500" />
              </Button>
            ) : null}
          </div>
          <DialogDescription className="whitespace-pre-wrap">{flashcard?.back ?? ""}</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
