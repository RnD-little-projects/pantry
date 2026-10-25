import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
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
    <AuthShell
      tagline="Make a list, let the cashier price it, pay once."
      title="Create an account"
      description="Pick a username and a password of at least 8 characters."
    >
      <div className="space-y-4">
        {error ? (
          <div role="alert" className="rounded-control bg-destructive/10 p-3 text-sm font-medium text-destructive">
            {error}
          </div>
        ) : null}

        {process.env.ALLOW_REGISTRATION === "false" ? (
          <div className="rounded-control bg-highlight/25 p-3 text-sm text-foreground">
            Sign-ups are turned off. Ask an admin to create your account.
          </div>
        ) : (
          <RegisterForm />
        )}

        <p className="text-center text-sm text-muted-foreground">
          Already have an account? <Link href="/login" className="font-semibold text-primary underline underline-offset-4">Sign in</Link>
        </p>
      </div>
    </AuthShell>
  );
}