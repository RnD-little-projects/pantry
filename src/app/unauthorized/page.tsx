import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="receipt w-full max-w-md px-8 pb-8 pt-8 text-center">
        <span aria-hidden="true" className="stamp text-base">Private</span>
        <h1 className="mt-6 text-lg font-bold uppercase tracking-wide">You can’t open this</h1>
        <p className="mt-3 text-sm text-muted-foreground">A list can only be opened by the person who made it and by market staff. Staff pages are for admins and cashiers.</p>

        <div className="receipt-rule mt-6 flex flex-col gap-3 pt-6 font-sans">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-control bg-primary px-4 text-[15px] font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Go to my lists
          </Link>
          <Link
            href="/market-list"
            className="inline-flex h-11 items-center justify-center rounded-control border border-current px-4 text-[15px] font-bold transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            See market prices
          </Link>
        </div>
      </div>
    </main>
  );
}
