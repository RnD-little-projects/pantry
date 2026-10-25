import type { ReactNode } from "react";

type AuthShellProps = {
  tagline: string;
  title: string;
  description: string;
  children: ReactNode;
};

// Decorative sample stickers that show what the app does at a glance
const sampleStickers = [
  { label: "Milk ₱92", tilt: "-rotate-6" },
  { label: "Eggs ₱98", tilt: "rotate-3" },
  { label: "Rice ₱260", tilt: "-rotate-2" },
];

export function AuthShell({ tagline, title, description, children }: Readonly<AuthShellProps>) {
  return (
    <main className="flex min-h-dvh flex-col bg-band text-band-foreground lg:grid lg:grid-cols-[1.1fr_1fr]">
      <section className="px-6 pb-16 pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-10 lg:flex lg:flex-col lg:justify-center lg:px-16 lg:pb-10">
        <p className="font-display text-5xl leading-none sm:text-7xl">Pantry</p>
        <p className="mt-4 max-w-sm text-lg leading-snug text-pretty opacity-90">{tagline}</p>
        <ul aria-hidden="true" className="mt-8 flex flex-wrap gap-4">
          {sampleStickers.map((sticker) => (
            <li key={sticker.label} className={`sticker text-sm shadow-none ring-4 ring-band-foreground/25 [transform:none] ${sticker.tilt}`}>
              {sticker.label}
            </li>
          ))}
        </ul>
      </section>

      <section className="-mt-8 flex-1 rounded-t-sheet bg-background px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-8 text-foreground sm:px-10 lg:mt-0 lg:flex lg:min-h-dvh lg:items-center lg:rounded-none lg:rounded-l-sheet">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="font-display text-3xl text-balance">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
