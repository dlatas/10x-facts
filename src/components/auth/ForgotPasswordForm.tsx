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
import { createAuthService } from '@/lib/services/auth.service';
import { authForgotPasswordCommandSchema } from '@/lib/validation/auth.schemas';

export function ForgotPasswordForm() {
  const auth = useMemo(() => createAuthService(), []);

  const emailId = useId();
  const [sent, setSent] = useState(false);
  const form = useForm<z.infer<typeof authForgotPasswordCommandSchema>>({
    resolver: zodResolver(authForgotPasswordCommandSchema),
    defaultValues: { email: '' },
  });

  useEffect(() => {
    const t = window.setTimeout(() => form.setFocus('email'), 0);
    return () => window.clearTimeout(t);
  }, [form]);

  const submit = form.handleSubmit(async (values) => {
    try {
      try {
        await auth.requestPasswordReset({ email: values.email });
        setSent(true);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Nie udało się wysłać linku. Spróbuj ponownie.';
        form.setError('root', { message });
      }
    } catch {
      form.setError('root', {
        message: 'Nie udało się wysłać linku. Spróbuj ponownie.',
      });
    }
  });

  const isLoading = form.formState.isSubmitting;
  const error = form.formState.errors.root?.message ?? null;
  const emailError = form.formState.errors.email?.message ?? null;

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
