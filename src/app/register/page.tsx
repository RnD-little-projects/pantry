import Link from "next/link";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { connectMongo } from "@/lib/db/mongodb";
import { User } from "@/models";

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

function toErrorRedirect(message: string) {
  return `/register?error=${encodeURIComponent(message)}`;
}

function isRedirectError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT"),
  );
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

              <form
                action={async (formData) => {
                  "use server";
                  try {
                    const username = String(formData.get("username") ?? "").trim();
                    const emailRaw = String(formData.get("email") ?? "").trim();
                    const email = emailRaw ? emailRaw.toLowerCase() : null;
                    const password = String(formData.get("password") ?? "");
                    const confirmPassword = String(formData.get("confirmPassword") ?? "");

                    if (username.length < 3) {
                      redirect(toErrorRedirect("Username must be at least 3 characters."));
                    }

                    if (password.length < 8) {
                      redirect(toErrorRedirect("Password must be at least 8 characters."));
                    }

                    if (password !== confirmPassword) {
                      redirect(toErrorRedirect("Passwords do not match."));
                    }

                    await connectMongo();

                    const existingUser = await User.findOne({
                      $or: email ? [{ username }, { email }] : [{ username }],
                    })
                      .select("_id")
                      .lean();

                    if (existingUser) {
                      redirect(toErrorRedirect("Username or email is already in use."));
                    }

                    const passwordHash = await bcrypt.hash(password, 12);

                    await User.create({
                      username,
                      email,
                      passwordHash,
                      provider: "local",
                      isActive: true,
                    });

                    await signIn("credentials", {
                      username,
                      password,
                      redirectTo: "/",
                    });
                  } catch (error) {
                    if (isRedirectError(error)) {
                      throw error;
                    }

                    console.error("Registration failed", {
                      error,
                    });

                    redirect(
                      toErrorRedirect("Registration is temporarily unavailable. Please check your database connection and try again."),
                    );
                  }
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="username">Username</label>
                  <input id="username" name="username" type="text" minLength={3} required className="h-11 w-full rounded-xl border border-border/70 bg-background px-3 outline-none ring-0 focus:border-primary" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="email">Email (optional)</label>
                  <input id="email" name="email" type="email" className="h-11 w-full rounded-xl border border-border/70 bg-background px-3 outline-none ring-0 focus:border-primary" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="password">Password</label>
                  <input id="password" name="password" type="password" minLength={8} required className="h-11 w-full rounded-xl border border-border/70 bg-background px-3 outline-none ring-0 focus:border-primary" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="confirmPassword">Confirm password</label>
                  <input id="confirmPassword" name="confirmPassword" type="password" minLength={8} required className="h-11 w-full rounded-xl border border-border/70 bg-background px-3 outline-none ring-0 focus:border-primary" />
                </div>
                <Button type="submit" className="w-full">Create account</Button>
              </form>

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