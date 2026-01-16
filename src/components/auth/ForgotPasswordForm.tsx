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

function isValidEmail(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function ForgotPasswordForm() {
  const auth = React.useMemo(() => createAuthService(), []);

  const emailId = React.useId();
  const emailRef = React.useRef<HTMLInputElement>(null);

  const [email, setEmail] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const [error, setError] = React.useState<string | null>(null);
  const [emailError, setEmailError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = window.setTimeout(() => emailRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, []);

  const validate = React.useCallback((): boolean => {
    setError(null);
    setEmailError(null);

    const e = email.trim();
    if (!e) {
      setEmailError('E-mail jest wymagany.');
      return false;
    }
    if (!isValidEmail(e)) {
      setEmailError('Podaj poprawny adres e-mail.');
      return false;
    }
    return true;
  }, [email]);

  const submit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isLoading) return;
      if (!validate()) return;

      setIsLoading(true);
      setError(null);
      try {
        await auth.requestPasswordReset({ email });
        setSent(true);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Nie udało się wysłać linku. Spróbuj ponownie.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [auth, email, isLoading, validate]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Odzyskiwanie hasła</CardTitle>
        <CardDescription>
          Wyślemy link do zresetowania hasła. Ze względów bezpieczeństwa
          komunikat jest taki sam niezależnie od tego, czy konto istnieje.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {sent ? (
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
            Jeśli konto istnieje, wysłaliśmy link do resetu na podany adres
            e-mail.
          </div>
        ) : (
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

            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Wysyłanie…' : 'Wyślij link do resetu'}
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="flex flex-col items-start gap-2">
        <p className="text-sm text-muted-foreground">
          Pamiętasz hasło?{' '}
          <a
            className="font-medium text-foreground underline underline-offset-4"
            href="/login"
          >
            Wróć do logowania
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}
