import * as React from 'react';
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
import { createAuthService } from '@/lib/services/auth.service';
import { authResetPasswordFormSchema } from '@/lib/validation/auth.schemas';

export function ResetPasswordForm() {
  const auth = React.useMemo(() => createAuthService(), []);

  const passwordId = React.useId();
  const confirmId = React.useId();
  const form = useForm<z.infer<typeof authResetPasswordFormSchema>>({
    resolver: zodResolver(authResetPasswordFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  React.useEffect(() => {
    const t = window.setTimeout(() => form.setFocus('password'), 0);
    return () => window.clearTimeout(t);
  }, [form]);

  const submit = form.handleSubmit(async (values) => {
    try {
      await auth.updatePassword({ password: values.password });
      window.location.assign('/login?reset=success');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Nie udało się zmienić hasła. Spróbuj ponownie.';
      form.setError('root', { message });
    }
  });

  const isLoading = form.formState.isSubmitting;
  const error = form.formState.errors.root?.message ?? null;
  const passwordError = form.formState.errors.password?.message ?? null;
  const confirmError = form.formState.errors.confirmPassword?.message ?? null;

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
              type="password"
              disabled={isLoading}
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
              htmlFor={confirmId}
              className="text-sm font-medium"
            >
              Potwierdź hasło
            </label>
            <Input
              id={confirmId}
              type="password"
              disabled={isLoading}
              placeholder="powtórz hasło"
              aria-invalid={confirmError ? true : undefined}
              aria-describedby={confirmError ? `${confirmId}-error` : undefined}
              {...form.register('confirmPassword')}
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
