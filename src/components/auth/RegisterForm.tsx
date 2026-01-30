import { useEffect, useId, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';

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
import { authSignupFormSchema } from '@/lib/validation/auth.schemas';

export function RegisterForm(props: { next?: string | null }) {
  const next = props.next ?? null;
  const safeNext = getSafeNextPath(next);
  const auth = useMemo(() => createAuthService(), []);

  const emailId = useId();
  const passwordId = useId();
  const confirmId = useId();

  const [success, setSuccess] = useState<string | null>(null);
  const form = useForm<z.infer<typeof authSignupFormSchema>>({
    resolver: zodResolver(authSignupFormSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  useEffect(() => {
    const t = window.setTimeout(() => form.setFocus('email'), 0);
    return () => window.clearTimeout(t);
  }, [form]);

  const submit = form.handleSubmit(async (values) => {
    setSuccess(null);
    try {
      const result = await auth.signup({
        email: values.email,
        password: values.password,
      });
      if (result.requiresEmailConfirmation) {
        setSuccess(
          'Wysłaliśmy e-mail z linkiem potwierdzającym. Sprawdź skrzynkę (także spam) i aktywuj konto, aby się zalogować.'
        );
        return;
      }
      const target = safeNext ?? '/dashboard';
      window.location.assign(target);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Nie udało się założyć konta. Spróbuj ponownie.';
      form.setError('root', { message });
    }
  });

  const isLoading = form.formState.isSubmitting;
  const error = form.formState.errors.root?.message ?? null;
  const emailError = form.formState.errors.email?.message ?? null;
  const passwordError = form.formState.errors.password?.message ?? null;
  const confirmPasswordError =
    form.formState.errors.confirmPassword?.message ?? null;

  const showLoginHint =
    error?.toLowerCase().includes('konto z tym adresem e-mail już istnieje') ??
    false;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Załóż konto</CardTitle>
        <CardDescription>
          Stwórz konto, aby korzystać z aplikacji.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => void submit(e)}
          noValidate
        >
          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <p>{error}</p>
              {showLoginHint ? (
                <a
                  className="mt-2 inline-flex text-sm font-medium text-foreground underline underline-offset-4"
                  href="/login"
                >
                  Masz już konto? Zaloguj się
                </a>
              ) : null}
            </div>
          ) : null}
          {success ? (
            <div
              className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700"
              aria-live="polite"
            >
              {success}
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
              type="email"
              disabled={isLoading}
              placeholder="twoj@email.com"
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? `${emailId}-error` : undefined}
              {...form.register('email')}
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
              disabled={isLoading}
              autoComplete="new-password"
              placeholder="min. 8 znaków"
              aria-invalid={passwordError ? true : undefined}
              aria-describedby={
                passwordError ? `${passwordId}-error` : undefined
              }
              {...form.register('password')}
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
              className="text-sm font-medium"
              htmlFor={confirmId}
            >
              Powtórz hasło
            </label>
            <Input
              id={confirmId}
              type="password"
              disabled={isLoading}
              autoComplete="new-password"
              placeholder="powtórz hasło"
              aria-invalid={confirmPasswordError ? true : undefined}
              aria-describedby={
                confirmPasswordError ? `${confirmId}-error` : undefined
              }
              {...form.register('confirmPassword')}
            />
            {confirmPasswordError ? (
              <p
                id={`${confirmId}-error`}
                className="text-sm text-destructive"
              >
                {confirmPasswordError}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Tworzenie konta…' : 'Zarejestruj się'}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col items-start gap-2">
        <p className="text-sm text-muted-foreground">
          Masz już konto?{' '}
          <a
            className="font-medium text-foreground underline underline-offset-4"
            href="/login"
          >
            Zaloguj się
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}
