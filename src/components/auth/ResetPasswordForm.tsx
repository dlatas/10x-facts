import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createAuthService } from '@/lib/services/auth.service';

export function ResetPasswordForm() {
  const auth = React.useMemo(() => createAuthService(), []);

  const passwordId = React.useId();
  const confirmId = React.useId();
  const passwordRef = React.useRef<HTMLInputElement>(null);

  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const [error, setError] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [confirmError, setConfirmError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = window.setTimeout(() => passwordRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, []);

  const validate = React.useCallback((): boolean => {
    setError(null);
    setPasswordError(null);
    setConfirmError(null);

    let ok = true;
    if (!password) {
      setPasswordError('Hasło jest wymagane.');
      ok = false;
    } else if (password.length < 8) {
      setPasswordError('Hasło musi mieć co najmniej 8 znaków.');
      ok = false;
    }

    if (!confirmPassword) {
      setConfirmError('Potwierdzenie hasła jest wymagane.');
      ok = false;
    } else if (confirmPassword !== password) {
      setConfirmError('Hasła muszą być takie same.');
      ok = false;
    }

    return ok;
  }, [confirmPassword, password]);

  const submit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isLoading) return;
      if (!validate()) return;

      setIsLoading(true);
      setError(null);
      try {
        await auth.updatePassword({ password });
        window.location.assign('/login?reset=success');
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Nie udało się zmienić hasła. Spróbuj ponownie.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [auth, isLoading, password, validate]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ustaw nowe hasło</CardTitle>
        <CardDescription>Wpisz nowe hasło i potwierdź je.</CardDescription>
      </CardHeader>

      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => void submit(e)}
          noValidate
        >
          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="grid gap-2">
            <label
              htmlFor={passwordId}
              className="text-sm font-medium"
            >
              Nowe hasło
            </label>
            <Input
              id={passwordId}
              ref={passwordRef}
              type="password"
              value={password}
              disabled={isLoading}
              placeholder="min. 8 znaków"
              aria-invalid={passwordError ? true : undefined}
              aria-describedby={
                passwordError ? `${passwordId}-error` : undefined
              }
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
            {passwordError ? (
              <p
                id={`${passwordId}-error`}
                className="text-sm text-destructive"
              >
                {passwordError}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <label
              htmlFor={confirmId}
              className="text-sm font-medium"
            >
              Potwierdź hasło
            </label>
            <Input
              id={confirmId}
              type="password"
              value={confirmPassword}
              disabled={isLoading}
              placeholder="powtórz hasło"
              aria-invalid={confirmError ? true : undefined}
              aria-describedby={confirmError ? `${confirmId}-error` : undefined}
              onChange={(e) => setConfirmPassword(e.currentTarget.value)}
            />
            {confirmError ? (
              <p
                id={`${confirmId}-error`}
                className="text-sm text-destructive"
              >
                {confirmError}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Zapisywanie…' : 'Zapisz nowe hasło'}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col items-start gap-2">
        <p className="text-sm text-muted-foreground">
          Po zapisaniu przekierujemy Cię do logowania.
        </p>
      </CardFooter>
    </Card>
  );
}
