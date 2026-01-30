import { memo } from 'react';
import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface CollectionsSearchInputProps {
  value: string;
  onValueChange: (v: string) => void;
  onCommitNow?: () => void;
  placeholder?: string;
}

export const CollectionsSearchInput = memo(function CollectionsSearchInput(
  props: CollectionsSearchInputProps
) {
  return (
    <div className="relative w-full sm:max-w-md">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />

      <Input
        aria-label="Szukaj kolekcji"
        className="pl-9 pr-10"
        value={props.value}
        placeholder={props.placeholder ?? 'Szukaj…'}
        onChange={(e) => props.onValueChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') props.onCommitNow?.();
        }}
      />

      {props.value ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="absolute right-1.5 top-1/2 size-8 -translate-y-1/2"
          onClick={() => props.onValueChange('')}
          aria-label="Wyczyść wyszukiwanie"
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  );
});

