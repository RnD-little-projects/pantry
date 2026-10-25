
import Link from "next/link";
import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "./login-form";

const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export default function LoginPage() {
  return (
    <AuthShell
      tagline="Your market list, priced by the cashier and paid in one go."
      title="Sign in"
      description="Use your Pantry username and password."
    >
      <div className="space-y-4">
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
            <p className="rounded-control bg-muted p-3 text-sm text-muted-foreground">
              Google sign-in isn’t available right now. Use your username and password.
            </p>
          )}

          {process.env.ALLOW_REGISTRATION !== "false" && (
            <p className="text-center text-sm text-muted-foreground">
              New here? <Link href="/register" className="font-semibold text-primary underline underline-offset-4">Create an account</Link>
            </p>
          )}
        </div>
      </div>
    </AuthShell>
  );
}
