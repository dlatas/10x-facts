import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function CreateCollectionInline(props: {
  onCreate: (name: string) => Promise<void>;
  isLoading?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState('');
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isLoading = props.isLoading ?? false;

  useEffect(() => {
    if (!isEditing) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [isEditing]);

  const cancel = useCallback(() => {
    if (isLoading) return;
    setIsEditing(false);
    setValue('');
  }, [isLoading]);

  const submit = useCallback(async () => {
    if (isLoading) return;
    const name = value.trim();
    if (!name) return;
    try {
      await props.onCreate(name);
      setIsEditing(false);
      setValue('');
    } catch {
      // Błąd jest obsługiwany w komponencie nadrzędnym
    }
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
    <div
      ref={containerRef}
      className="flex w-full items-center gap-2"
      onBlur={(e) => {
        const next = e.relatedTarget as Node | null;
        if (next && containerRef.current?.contains(next)) return;
        cancel();
      }}
    >
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
      />
      <Button
        type="button"
        size="sm"
        disabled={isLoading || value.trim().length === 0}
        onMouseDown={(e) => {
          e.preventDefault();
        }}
        onClick={() => void submit()}
      >
        Dodaj
      </Button>
    </div>
  );
}
