import { Heart } from "lucide-react";

import type { FavoriteFlashcardDto } from "@/types";
import { Dialog, DialogCloseButton, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function FlashcardDetailsDialog(props: {
  isOpen: boolean;
  onClose: () => void;
  flashcard: FavoriteFlashcardDto | null;
  onToggleFavorite?: () => void;
  isTogglingFavorite?: boolean;
}) {
  const { isOpen, onClose, flashcard } = props;

  const open = isOpen && !!flashcard;

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
          {props.onToggleFavorite ? (
            <>
              <div className="flex items-start justify-between gap-3">
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
                <DialogCloseButton />
              </div>

              <DialogTitle className="mt-3 text-left leading-normal">
                {flashcard?.front ?? ""}
              </DialogTitle>
              <DialogDescription className="whitespace-pre-wrap text-left">
                {flashcard?.back ?? ""}
              </DialogDescription>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <DialogTitle className="min-w-0 flex-1 text-left leading-normal">
                  {flashcard?.front ?? ""}
                </DialogTitle>
                <DialogCloseButton />
              </div>
              <DialogDescription className="whitespace-pre-wrap text-left">
                {flashcard?.back ?? ""}
              </DialogDescription>
            </>
          )}
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
