import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-sheet border border-border bg-card p-8 text-center">
        <span aria-hidden="true" className="sticker sticker-empty text-lg">Private</span>
        <h1 className="font-display mt-6 text-2xl text-balance">This list isn’t shared</h1>
        <p className="mt-3 text-sm text-muted-foreground">Ask the owner to make it public, or sign in with the account that made it.</p>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-control bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Go to my lists
          </Link>
          <Link
            href="/market-list"
            className="inline-flex h-11 items-center justify-center rounded-control border border-input bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            See market prices
          </Link>
        </div>
      </div>
    </main>
  );
}
