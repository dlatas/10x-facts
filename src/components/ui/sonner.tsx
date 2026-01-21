import * as React from 'react';
import { Toaster as Sonner } from 'sonner';

export const Toaster = React.memo(function Toaster() {
  return (
    <Sonner
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: 'bg-background text-foreground border shadow-sm',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-muted text-foreground',
        },
      }}
    />
  );
});

