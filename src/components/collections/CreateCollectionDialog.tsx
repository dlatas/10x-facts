import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export interface CreateCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => Promise<void>;
  isSubmitting: boolean;
  errorMessage: string | null;
}

const MAX_NAME_LEN = 120;

export const CreateCollectionDialog = React.memo(function CreateCollectionDialog(
  props: CreateCollectionDialogProps
) {
  const [name, setName] = React.useState('');
  const [localError, setLocalError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (props.open) return;
    setName('');
    setLocalError(null);
  }, [props.open]);

  const validate = React.useCallback((raw: string): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) return 'Podaj nazwę kolekcji.';
    if (trimmed.length > MAX_NAME_LEN)
      return `Nazwa może mieć maksymalnie ${MAX_NAME_LEN} znaków.`;
    return null;
  }, []);

  const submit = React.useCallback(async () => {
    const err = validate(name);
    setLocalError(err);
    if (err) return;
    await props.onSubmit(name);
  }, [name, props, validate]);

  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        if (props.isSubmitting) return;
        props.onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Utwórz kolekcję</DialogTitle>
          <DialogDescription>
            Podaj nazwę nowej kolekcji. Nazwa musi być unikalna.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="create-collection-name">
            Nazwa
          </label>
          <Input
            id="create-collection-name"
            value={name}
            disabled={props.isSubmitting}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit();
            }}
            aria-invalid={Boolean(localError || props.errorMessage) || undefined}
            aria-describedby={
              localError || props.errorMessage ? 'create-collection-error' : undefined
            }
          />
          {localError || props.errorMessage ? (
            <p id="create-collection-error" className="text-sm text-destructive">
              {localError ?? props.errorMessage}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => props.onOpenChange(false)}
            disabled={props.isSubmitting}
          >
            Anuluj
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={props.isSubmitting}>
            {props.isSubmitting ? 'Tworzenie…' : 'Utwórz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

