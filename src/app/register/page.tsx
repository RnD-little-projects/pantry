import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "./register-form";

type RegisterPageProps = {
  searchParams?: Promise<{
    error?: string | string[];
  }>;
};

function getFirstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function RegisterPage({ searchParams }: Readonly<RegisterPageProps>) {
  const resolvedSearchParams = await searchParams;
  const error = getFirstParam(resolvedSearchParams?.error);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.18),_transparent_28%),linear-gradient(180deg,_#050816_0%,_#0b1220_100%)] px-4 py-10 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-[0_30px_100px_-60px_rgba(0,0,0,0.9)] backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-200/80">Pantry OS</p>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">Create your account and start managing pantry workflows.</h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300">Register with a unique username, optionally add an email, and use at least 8 characters for your password.</p>
            <div className="mt-8 flex flex-wrap gap-3 text-xs uppercase tracking-[0.28em] text-slate-400">
              <span className="rounded-full border border-white/10 px-3 py-2">Fast setup</span>
              <span className="rounded-full border border-white/10 px-3 py-2">Secure hashing</span>
              <span className="rounded-full border border-white/10 px-3 py-2">Auto sign-in</span>
            </div>
          </section>

          <Card className="border-border/60 bg-card/90 shadow-[0_30px_100px_-60px_rgba(0,0,0,0.75)] backdrop-blur-xl">
            <CardHeader className="space-y-3 border-b border-border/60">
              <CardTitle>Register</CardTitle>
              <CardDescription>Create a local pantry account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {error ? (
                <div className="rounded-xl border border-red-300/30 bg-red-500/10 p-3 text-sm text-red-100">
                  {error}
                </div>
              ) : null}

              {process.env.ALLOW_REGISTRATION === "false" ? (
                <div className="rounded-xl border border-amber-300/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                  Account registration is currently disabled by administrator.
                </div>
              ) : (
                <RegisterForm />
              )}

              <p className="text-center text-xs text-muted-foreground">
                Already have an account? <Link href="/login" className="underline underline-offset-4">Sign in</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}