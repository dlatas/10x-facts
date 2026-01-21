import * as React from 'react';

import type { DeleteTopicConfirmDialogProps } from '@/components/collection-topics/collection-topics.types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const DeleteTopicConfirmDialog = React.memo(function DeleteTopicConfirmDialog(
  props: DeleteTopicConfirmDialogProps
) {
  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        if (props.isDeleting) return;
        props.onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Usunąć temat?</DialogTitle>
          <DialogDescription>
            Ta operacja jest nieodwracalna. Usunięcie tematu spowoduje także kaskadowe
            usunięcie powiązanych fiszek.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <p className="text-muted-foreground">Temat:</p>
          <p className="font-medium">{props.topicName ?? '—'}</p>
        </div>

        <DialogFooter>
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
});

