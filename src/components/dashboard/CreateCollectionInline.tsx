import * as React from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function CreateCollectionInline(props: {
  onCreate: (name: string) => Promise<void>;
  isLoading?: boolean;
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [value, setValue] = React.useState('');
  const inputId = React.useId();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const isLoading = props.isLoading ?? false;

  React.useEffect(() => {
    if (!isEditing) return;
    // Focus only after explicit user intent (click "Dodaj kolekcję"), avoid autoFocus prop.
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [isEditing]);

  const cancel = React.useCallback(() => {
    if (isLoading) return;
    setIsEditing(false);
    setValue('');
  }, [isLoading]);

  const submit = React.useCallback(async () => {
    if (isLoading) return;
    const name = value.trim();
    if (!name) return;
    await props.onCreate(name);
    setIsEditing(false);
    setValue('');
  }, [isLoading, props, value]);

  if (!isEditing) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={() => setIsEditing(true)}
      >
        <Plus className="h-4 w-4" />
        Dodaj kolekcję
      </Button>
    );
  }

  return (
    <div className="flex w-full items-center gap-2">
      <label
        className="sr-only"
        htmlFor={inputId}
      >
        Nazwa kolekcji
      </label>
      <Input
        id={inputId}
        ref={inputRef}
        value={value}
        disabled={isLoading}
        placeholder="Nazwa kolekcji…"
        onChange={(e) => setValue(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
            return;
          }
          if (e.key === 'Enter') {
            e.preventDefault();
            void submit();
          }
        }}
        onBlur={() => cancel()}
      />
      <Button
        type="button"
        size="sm"
        disabled={isLoading || value.trim().length === 0}
        onClick={() => void submit()}
      >
        Dodaj
      </Button>
    </div>
  );
}
