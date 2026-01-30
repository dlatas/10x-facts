import * as React from "react";

import { Folder, Heart, LayoutGrid, Menu } from "lucide-react";

import type { NavLinkId } from "@/components/navbar/nav-links";
import { NAV_LINKS } from "@/components/navbar/nav-links";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

const iconMap: Record<NavLinkId, React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  dashboard: LayoutGrid,
  collections: Folder,
  favorites: Heart,
};

export function MobileNav(props: { pathname: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Otwórz menu"
        >
          <Menu />
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-80 px-5">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span
              className="inline-flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-sm ring-1 ring-primary/20"
              aria-hidden="true"
            >
              <span className="text-sm font-bold text-primary-foreground">10x</span>
            </span>
            <span className="text-base font-semibold tracking-tight">Facts</span>
          </SheetTitle>
        </SheetHeader>

        <nav className="mt-6 flex flex-col gap-1 text-sm">
          {NAV_LINKS.map((link) => {
            const Icon = iconMap[link.id];
            const active = isActive(props.pathname, link.href);
            return (
              <a
                key={link.id}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-3 py-2 transition-colors",
                  active
                    ? "bg-primary/10 text-foreground ring-1 ring-primary/20"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                <span className="truncate">{link.label}</span>
              </a>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

