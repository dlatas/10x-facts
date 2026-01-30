import { memo } from 'react';

export interface SystemBadgeProps {
  systemKey: string;
}

export const SystemBadge = memo(function SystemBadge(props: SystemBadgeProps) {
  const label =
    props.systemKey === 'random_collection' ? 'Kolekcja losowa' : 'Systemowa';

  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
      {label}
    </span>
  );
});

