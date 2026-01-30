import { useEffect, useId, useMemo } from 'react';
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
import { authLoginCommandSchema } from '@/lib/validation/auth.schemas';

export function LoginForm(props: { next?: string | null }) {
  const next = props.next ?? null;
  const auth = useMemo(() => createAuthService(), []);

  const emailId = useId();
  const passwordId = useId();

  const form = useForm<z.infer<typeof authLoginCommandSchema>>({
    resolver: zodResolver(authLoginCommandSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    const t = window.setTimeout(() => form.setFocus('email'), 0);
    return () => window.clearTimeout(t);
  }, [form]);

  const submit = form.handleSubmit(async (values) => {
    try {
      try {
        await auth.login({ email: values.email, password: values.password });
        const target = getSafeNextPath(next) ?? '/dashboard';
        window.location.assign(target);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Nie udało się zalogować. Spróbuj ponownie.';
        form.setError('root', { message });
      }
    } catch {
      form.setError('root', {
        message: 'Nie udało się zalogować. Spróbuj ponownie.',
      });
    }
  });

  const error = form.formState.errors.root?.message ?? null;
  const emailError = form.formState.errors.email?.message ?? null;
  const passwordError = form.formState.errors.password?.message ?? null;
  const isLoading = form.formState.isSubmitting;

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
              type="email"
              disabled={isLoading}
              autoComplete="email"
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
              autoComplete="current-password"
              placeholder="••••••••"
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
