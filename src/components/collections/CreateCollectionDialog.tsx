import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';

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
import { createCollectionCommandSchema } from '@/lib/validation/collections.schemas';

export interface CreateCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => Promise<void>;
  isSubmitting: boolean;
  errorMessage: string | null;
}

export const CreateCollectionDialog = React.memo(function CreateCollectionDialog(
  props: CreateCollectionDialogProps
) {
  const form = useForm<z.infer<typeof createCollectionCommandSchema>>({
    resolver: zodResolver(createCollectionCommandSchema),
    defaultValues: { name: '' },
  });

  React.useEffect(() => {
    if (props.open) return;
    form.reset({ name: '' });
    form.clearErrors();
  }, [form, props.open]);

  const localError = form.formState.errors.name?.message ?? null;

  const submit = form.handleSubmit(async (values) => {
    await props.onSubmit(values.name);
  });

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

        <form
          className="space-y-4"
          onSubmit={(e) => void submit(e)}
          noValidate
        >
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="create-collection-name">
              Nazwa
            </label>

            <Input
              id="create-collection-name"
              disabled={props.isSubmitting}
              aria-invalid={Boolean(localError || props.errorMessage) || undefined}
              aria-describedby={
                localError || props.errorMessage ? 'create-collection-error' : undefined
              }
              {...form.register('name')}
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

            <Button type="submit" disabled={props.isSubmitting}>
              {props.isSubmitting ? 'Tworzenie…' : 'Utwórz'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

