import { Button } from '@/components/ui/button';
import { Dialog, DialogCloseButton, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface AiLimitVm {
  remaining: number;
  reset_at_utc: string;
}

export interface AiProposalVm {
  front: string;
  back: string;
}

export function AiProposalDialog(props: {
  open: boolean;
  proposal: AiProposalVm | null;
  limit: AiLimitVm | null;
  isAccepting: boolean;
  isRejecting: boolean;
  onClose: () => void;
  onReject: () => void;
  onAccept: (proposal: AiProposalVm) => void;
}) {
  const isBusy = props.isAccepting || props.isRejecting;

  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
    >
      <DialogContent
        hideClose
        className="max-h-[85vh] w-[calc(100%-2rem)] overflow-y-auto px-4 py-5 sm:max-w-2xl sm:px-6 sm:py-6 md:max-w-3xl"
      >
        <DialogHeader className="text-left">
          <div className="flex items-start justify-between gap-3">
            <DialogTitle className="min-w-0 flex-1">Propozycja AI</DialogTitle>
            <DialogCloseButton />
          </div>
          <DialogDescription className="text-left">
            {props.limit ? (
              <span>
                Pozostałe decyzje: <strong>{props.limit.remaining}</strong> (reset:{' '}
                {props.limit.reset_at_utc})
              </span>
            ) : (
              'Zapisz albo odrzuć propozycję.'
            )}
          </DialogDescription>
        </DialogHeader>

        {props.proposal ? (
          <div className="space-y-3">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Front</p>
              <p className="mt-1 font-medium">{props.proposal.front}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Back</p>
              <p className="mt-1 text-sm">{props.proposal.back}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Brak danych propozycji.</p>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={props.onClose} disabled={isBusy}>
            Zamknij
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={props.onReject}
            disabled={!props.proposal || isBusy}
          >
            {props.isRejecting ? 'Odrzucanie…' : 'Odrzuć'}
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (!props.proposal) return;
              props.onAccept(props.proposal);
            }}
            disabled={!props.proposal || isBusy}
          >
            {props.isAccepting ? 'Zapisywanie…' : 'Zapisz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

