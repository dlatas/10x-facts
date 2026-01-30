import * as React from "react";
import type { UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Dialog, DialogCloseButton, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface TopicDescriptionFormValues {
  description: string;
}

export function TopicDescriptionDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<TopicDescriptionFormValues>;
  status: "idle" | "saving" | "saved" | "error";
  setStatus: (status: "idle" | "saving" | "saved" | "error") => void;
  isSaving: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
  onSave: () => void;
}) {
  const isBusy = props.isSaving || props.isGenerating;
  const reg = props.form.register("description");
  const draft = props.form.watch("description") ?? "";
  const fieldError = props.form.formState.errors.description?.message ?? null;
  const rootError = props.form.formState.errors.root?.message ?? null;

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        hideClose
        className="max-h-[85vh] w-[calc(100%-2rem)] overflow-y-auto px-4 py-5 sm:max-w-2xl sm:px-6 sm:py-6"
      >
        <DialogHeader className="text-left">
          <div className="flex items-start justify-between gap-3">
            <DialogTitle className="min-w-0 flex-1">Opis tematu</DialogTitle>
            <DialogCloseButton />
          </div>
          <DialogDescription className="text-left">
            Opis wpływa na jakość generowania AI. Zapis jest manualny.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (isBusy) return;
            props.onSave();
          }}
          noValidate
        >
          <label className="text-sm font-medium" htmlFor="topic-description">
            Opis
          </label>

          <textarea
            id="topic-description"
            {...reg}
            onChange={(e) => {
              reg.onChange(e);
              if (props.status !== "idle") props.setStatus("idle");
            }}
            placeholder='Wprowadź swój opis tematu lub kliknij przycisk „Generuj opis”.'
            disabled={isBusy}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={
              fieldError
                ? "topic-description-error"
                : rootError
                  ? "topic-description-root-error"
                  : undefined
            }
            className="min-h-36 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
          />

          {fieldError ? (
            <p id="topic-description-error" className="text-sm text-destructive">
              {fieldError}
            </p>
          ) : null}

          {rootError ? (
            <p
              id="topic-description-root-error"
              className="text-sm text-destructive"
            >
              {rootError}
            </p>
          ) : null}

          {draft.trim().length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Wskazówka: pusty opis może obniżyć jakość propozycji AI.
            </p>
          ) : null}

          {props.status === "saved" ? (
            <p className="text-sm text-muted-foreground">Zapisano.</p>
          ) : props.status === "error" ? (
            <p className="text-sm text-destructive">Nie udało się zapisać.</p>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => props.onOpenChange(false)}
              disabled={isBusy}
            >
              Zamknij
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={props.onGenerate}
              disabled={isBusy}
            >
              {props.isGenerating ? "Generowanie…" : "Generuj opis"}
            </Button>
            <Button type="submit" disabled={isBusy}>
              {props.isSaving ? "Zapisywanie…" : "Zapisz"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

