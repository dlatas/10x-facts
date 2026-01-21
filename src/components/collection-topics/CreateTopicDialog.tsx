import * as React from 'react';

import type { CreateTopicDialogProps } from '@/components/collection-topics/collection-topics.types';
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

const MAX_NAME_LEN = 120;

export const CreateTopicDialog = React.memo(function CreateTopicDialog(
  props: CreateTopicDialogProps
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
    if (!trimmed) return 'Podaj nazwę tematu.';
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
          <DialogTitle>Utwórz temat</DialogTitle>
          <DialogDescription>
            Podaj nazwę nowego tematu. Opis możesz uzupełnić później.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="create-topic-name">
            Nazwa
          </label>
          <Input
            id="create-topic-name"
            value={name}
            disabled={props.isSubmitting}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit();
            }}
            aria-invalid={Boolean(localError || props.errorMessage) || undefined}
            aria-describedby={
              localError || props.errorMessage ? 'create-topic-error' : undefined
            }
          />
          {localError || props.errorMessage ? (
            <p id="create-topic-error" className="text-sm text-destructive">
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

