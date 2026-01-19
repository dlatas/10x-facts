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
import { getSafeNextPath } from '@/lib/http/redirect';
import { createAuthService } from '@/lib/services/auth.service';

function isValidEmail(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  // Prosta walidacja (UX). Backend i tak zweryfikuje format.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function LoginForm(props: { next?: string | null }) {
  const next = props.next ?? null;
  const auth = React.useMemo(() => createAuthService(), []);

  const emailId = React.useId();
  const passwordId = React.useId();
  const emailRef = React.useRef<HTMLInputElement>(null);

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const [error, setError] = React.useState<string | null>(null);
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = window.setTimeout(() => emailRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, []);

  const validate = React.useCallback((): boolean => {
    setError(null);
    setEmailError(null);
    setPasswordError(null);

    const e = email.trim();
    const p = password;

    let ok = true;
    if (!e) {
      setEmailError('E-mail jest wymagany.');
      ok = false;
    } else if (!isValidEmail(e)) {
      setEmailError('Podaj poprawny adres e-mail.');
      ok = false;
    }

    if (!p) {
      setPasswordError('Hasło jest wymagane.');
      ok = false;
    } else if (p.length < 8) {
      setPasswordError('Hasło musi mieć co najmniej 8 znaków.');
      ok = false;
    }

    return ok;
  }, [email, password]);

  const submit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isLoading) return;
      if (!validate()) return;

      setIsLoading(true);
      setError(null);
      try {
        await auth.login({ email, password });
        const target = getSafeNextPath(next) ?? '/dashboard';
        window.location.assign(target);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Nie udało się zalogować. Spróbuj ponownie.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [auth, email, isLoading, next, password, validate]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zaloguj się</CardTitle>
        <CardDescription>Wpisz dane, aby przejść do aplikacji.</CardDescription>
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
              htmlFor={emailId}
              className="text-sm font-medium"
            >
              E-mail
            </label>
            <Input
              id={emailId}
              ref={emailRef}
              type="email"
              value={email}
              disabled={isLoading}
              placeholder="twoj@email.com"
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? `${emailId}-error` : undefined}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
            {emailError ? (
              <p
                id={`${emailId}-error`}
                className="text-sm text-destructive"
              >
                {emailError}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <label
              htmlFor={passwordId}
              className="text-sm font-medium"
            >
              Hasło
            </label>
            <Input
              id={passwordId}
              type="password"
              value={password}
              disabled={isLoading}
              placeholder="••••••••"
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

          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Logowanie…' : 'Zaloguj się'}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col items-start gap-2">
        <a
          className="text-sm text-muted-foreground hover:text-foreground"
          href="/forgot-password"
        >
          Nie pamiętasz hasła?
        </a>
        <p className="text-sm text-muted-foreground">
          Nie masz konta?{' '}
          <a
            className="font-medium text-foreground underline underline-offset-4"
            href="/register"
          >
            Zarejestruj się
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}
