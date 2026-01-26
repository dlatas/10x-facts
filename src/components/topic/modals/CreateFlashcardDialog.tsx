import type * as React from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export interface FlashcardFormValues {
  front: string;
  back: string;
}

export function CreateFlashcardDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<FlashcardFormValues>;
  isPending: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj fiszkę</DialogTitle>
          <DialogDescription>Tworzenie manualne. Front ≤ 200, back ≤ 600.</DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={props.onSubmit} noValidate>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="create-front">
              Front
            </label>
            <Input
              id="create-front"
              disabled={props.isPending}
              aria-invalid={Boolean(props.form.formState.errors.front) || undefined}
              aria-describedby={
                props.form.formState.errors.front ? 'create-front-error' : undefined
              }
              {...props.form.register('front')}
            />
            {props.form.formState.errors.front?.message ? (
              <p id="create-front-error" className="text-sm text-destructive">
                {props.form.formState.errors.front.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="create-back">
              Back
            </label>
            <textarea
              id="create-back"
              disabled={props.isPending}
              className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
              aria-invalid={Boolean(props.form.formState.errors.back) || undefined}
              aria-describedby={
                props.form.formState.errors.back ? 'create-back-error' : undefined
              }
              {...props.form.register('back')}
            />
            {props.form.formState.errors.back?.message ? (
              <p id="create-back-error" className="text-sm text-destructive">
                {props.form.formState.errors.back.message}
              </p>
            ) : null}
          </div>

          {props.form.formState.errors.root?.message ? (
            <p className="text-sm text-destructive">
              {props.form.formState.errors.root.message}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => props.onOpenChange(false)}
              disabled={props.isPending}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={props.isPending}>
              {props.isPending ? 'Dodawanie…' : 'Dodaj'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

