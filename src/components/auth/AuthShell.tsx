import type { ReactNode } from "react";

type AuthShellProps = {
  tagline: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthShell({ tagline, title, description, children }: Readonly<AuthShellProps>) {
  return (
    <main className="min-h-dvh bg-background px-4 pb-10 pt-[max(2rem,env(safe-area-inset-top))] text-foreground sm:px-8 lg:grid lg:grid-cols-[1fr_440px_1fr] lg:items-center lg:gap-16">
      <section className="mx-auto max-w-md lg:mx-0 lg:justify-self-end lg:text-right">
        <p className="font-display text-5xl leading-none sm:text-6xl">Pantry</p>
        <p className="mt-3 text-lg text-pretty text-muted-foreground">{tagline}</p>
      </section>

      <section className="receipt mx-auto mt-8 w-full max-w-md px-6 pb-8 pt-7 sm:px-8 lg:mt-0">
        <header className="pb-4 text-center">
          <h1 className="text-lg font-bold uppercase tracking-wide">{title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </header>
        <div className="receipt-rule pt-6 font-sans">{children}</div>
      </section>
    </main>
  );
}
