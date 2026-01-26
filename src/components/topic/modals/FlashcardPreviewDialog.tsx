import * as React from "react";

import type { FlashcardItemVm } from "@/components/topic/topic.types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function FlashcardPreviewDialog(props: {
  open: boolean;
  flashcard: Pick<FlashcardItemVm, "front" | "back"> | null;
  onClose: () => void;
}) {
  const { open, flashcard, onClose } = props;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl md:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="pr-8">{flashcard?.front ?? ""}</DialogTitle>
          <DialogDescription className="whitespace-pre-wrap">
            {flashcard?.back ?? ""}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

