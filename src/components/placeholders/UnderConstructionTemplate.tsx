import { Button } from "@/components/ui/button";

export function UnderConstructionTemplate(props: {
  title: string;
  description?: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  const { title, description, ctaHref, ctaLabel } = props;

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-[520px] flex-col items-center gap-4 text-center">
        <div className="text-5xl leading-none" aria-hidden="true">
          :|
        </div>

        <div className="grid gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>

        <Button asChild variant="default" size="sm">
          <a href={ctaHref}>{ctaLabel}</a>
        </Button>
      </div>
    </main>
  );
}

