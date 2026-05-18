
import Link from "next/link";
import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.18),_transparent_28%),linear-gradient(180deg,_#050816_0%,_#0b1220_100%)] px-4 py-10 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-[0_30px_100px_-60px_rgba(0,0,0,0.9)] backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-200/80">Pantry OS</p>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">Sign in to manage orders, pricing, and shared sessions.</h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300">Use a username and password to continue. Google sign-in is available only when configured, and public order links can still be viewed without signing in.</p>
            <div className="mt-8 flex flex-wrap gap-3 text-xs uppercase tracking-[0.28em] text-slate-400">
              <span className="rounded-full border border-white/10 px-3 py-2">Credentials</span>
              <span className="rounded-full border border-white/10 px-3 py-2">Google optional</span>
              <span className="rounded-full border border-white/10 px-3 py-2">Public shares</span>
            </div>
          </section>

          <Card className="border-border/60 bg-card/90 shadow-[0_30px_100px_-60px_rgba(0,0,0,0.75)] backdrop-blur-xl">
            <CardHeader className="space-y-3 border-b border-border/60">
              <CardTitle>Login</CardTitle>
              <CardDescription>Sign in with your pantry account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <LoginForm />

              <div className="space-y-3 pt-2">
                {googleEnabled ? (
                  <form action={async () => {
                    "use server";
                    const { headers } = await import("next/headers");
                    const headersList = await headers();
                    const host = headersList.get("x-forwarded-host") || headersList.get("host");
                    const proto = headersList.get("x-forwarded-proto") || "https";
                    if (host) {
                      process.env.AUTH_URL = `${proto}://${host}/api/auth`;
                    }
                    await signIn("google", { redirectTo: "/" });
                  }}>
                    <Button type="submit" variant="outline" className="w-full">Continue with Google</Button>
                  </form>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
                    Google auth is not working as of the moment.
                  </div>
                )}

                {process.env.ALLOW_REGISTRATION !== "false" && (
                  <div className="text-center text-xs text-muted-foreground">
                    New here? <Link href="/register" className="underline underline-offset-4">Create an account</Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
