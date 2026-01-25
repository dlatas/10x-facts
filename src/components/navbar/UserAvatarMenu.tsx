import * as React from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { redirectToLogin } from '@/lib/http/redirect';
import { createAuthService } from '@/lib/services/auth.service';

export function UserAvatarMenu(props: { email?: string | null }) {
  const email = props.email ?? null;
  const letter = (email?.trim()?.[0] ?? 'U').toUpperCase();
  const auth = React.useMemo(() => createAuthService(), []);
  const [isLoading, setIsLoading] = React.useState(false);

  const onLogout = React.useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await auth.logout();
      redirectToLogin();
    } catch {
      setIsLoading(false);
    }
  }, [auth, isLoading]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          aria-label="Menu użytkownika"
        >
          <Avatar>
            <AvatarFallback>{letter}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="max-w-[220px] truncate">
          {email ?? 'Użytkownik'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/user">Profil</a>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            void onLogout();
          }}
          disabled={isLoading}
        >
          {isLoading ? 'Wylogowywanie…' : 'Wyloguj się'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
