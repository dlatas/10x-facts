import { memo } from 'react';
import { X } from 'lucide-react';

import type { TopicsSearchInputProps } from '@/components/collection-topics/collection-topics.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const TopicsSearchInput = memo(function TopicsSearchInput(
  props: TopicsSearchInputProps
) {
  return (
    <div className="flex w-full items-center gap-2">
      <div className="w-full">
        <Input
          value={props.value}
          onChange={(e) => props.onValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') props.onCommitNow?.();
          }}
          placeholder={props.placeholder ?? 'Szukaj tematu…'}
          disabled={props.disabled}
          aria-label="Szukaj tematu po nazwie"
        />
      </div>

      {props.value ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => props.onValueChange('')}
          disabled={props.disabled}
          aria-label="Wyczyść wyszukiwanie"
          title="Wyczyść"
        >
          <X />
        </Button>
      ) : null}
    </div>
  );
});

