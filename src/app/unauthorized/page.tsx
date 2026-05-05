import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md rounded-3xl border border-border/70 bg-card p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground">Access denied</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">This page is not public shared.</h1>
        <p className="mt-3 text-sm text-muted-foreground">You need the correct access or a public share link to view this order session.</p>
        <div className="mt-6 flex justify-center">
          <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-2xl border border-transparent bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-[0_12px_30px_-14px_rgba(45,212,191,0.75)] transition-all duration-200 hover:brightness-110">
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}
