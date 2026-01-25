import { Button } from "@/components/ui/button";

export function NotFoundTemplate(props: {
  requestedPath: string;
  loginHref: string;
}) {
  const { requestedPath, loginHref } = props;

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-[520px] flex-col items-center gap-4 text-center">
        <div className="text-5xl leading-none" aria-hidden="true">
          :(
        </div>

        <div className="grid gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Nie znaleziono strony
          </h1>
          <p className="text-sm text-muted-foreground">
            Ten adres nie istnieje albo został przeniesiony.
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          Adres:{" "}
          <code className="rounded bg-muted px-2 py-1 text-xs text-foreground">
            {requestedPath}
          </code>
        </p>

        <Button asChild variant="default" size="sm">
          <a href={loginHref}>Przejdź do logowania</a>
        </Button>
      </div>
    </main>
  );
}

