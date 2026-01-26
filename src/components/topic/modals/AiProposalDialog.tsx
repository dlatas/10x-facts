import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl md:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Propozycja AI</DialogTitle>
          <DialogDescription>
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

        <DialogFooter>
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

