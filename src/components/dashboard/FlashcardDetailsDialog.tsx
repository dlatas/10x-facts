import * as React from "react";

import type { FavoriteFlashcardDto } from "@/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function FlashcardDetailsDialog(props: {
  isOpen: boolean;
  onClose: () => void;
  flashcard: FavoriteFlashcardDto | null;
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
          <DialogTitle>{flashcard?.front ?? ""}</DialogTitle>
          <DialogDescription className="whitespace-pre-wrap">{flashcard?.back ?? ""}</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
