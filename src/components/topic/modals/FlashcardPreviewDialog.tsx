import * as React from "react";

import type { FlashcardItemVm } from "@/components/topic/topic.types";
import { Dialog, DialogCloseButton, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
      <DialogContent
        hideClose
        className="max-h-[85vh] w-[calc(100%-2rem)] overflow-y-auto px-4 py-5 sm:max-w-2xl sm:px-6 sm:py-6 md:max-w-3xl"
      >
        <DialogHeader className="text-left">
          <div className="flex items-start justify-between gap-3">
            <DialogTitle className="min-w-0 flex-1 text-left">{flashcard?.front ?? ""}</DialogTitle>
            <DialogCloseButton />
          </div>
          <DialogDescription className="whitespace-pre-wrap text-left">
            {flashcard?.back ?? ""}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

