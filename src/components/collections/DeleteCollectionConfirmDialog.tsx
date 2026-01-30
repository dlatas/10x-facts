import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface DeleteCollectionConfirmDialogProps {
  open: boolean;
  collectionName: string | null;
  onConfirm: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
  isDeleting: boolean;
}

export const DeleteCollectionConfirmDialog = React.memo(
  function DeleteCollectionConfirmDialog(props: DeleteCollectionConfirmDialogProps) {
    return (
      <Dialog
        open={props.open}
        onOpenChange={(open) => {
          if (props.isDeleting) return;
          props.onOpenChange(open);
        }}
      >
        <DialogContent
          hideClose
          className="max-h-[85vh] w-[calc(100%-2rem)] overflow-y-auto px-4 py-5 sm:max-w-lg sm:px-6 sm:py-6"
        >
          <DialogHeader className="text-left">
            <div className="flex items-start justify-between gap-3">
              <DialogTitle className="min-w-0 flex-1">Usunąć kolekcję?</DialogTitle>
              <DialogCloseButton />
            </div>
            <DialogDescription className="text-left">
              Ta operacja jest nieodwracalna. Usunięcie kolekcji spowoduje także kaskadowe
              usunięcie powiązanych tematów i fiszek.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <p className="text-muted-foreground">Kolekcja:</p>
            <p className="font-medium">{props.collectionName ?? '—'}</p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => props.onOpenChange(false)}
              disabled={props.isDeleting}
            >
              Anuluj
            </Button>

            <Button
              type="button"
              variant="destructive"
              onClick={() => void props.onConfirm()}
              disabled={props.isDeleting}
            >
              {props.isDeleting ? 'Usuwanie…' : 'Usuń'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

