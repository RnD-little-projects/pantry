import { auth } from "@/auth";
import { AppShell } from "../components/app-shell";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { getMarketItems, getOverviewSessions } from "../lib/pantry-db";

export default async function Home() {
  const session = await auth();
  const [sessions, marketItems] = await Promise.all([getOverviewSessions(), getMarketItems()]);

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Sign in to continue to the pantry dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/login" method="get">
              <button className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-transparent bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-[0_12px_30px_-14px_rgba(45,212,191,0.75)] transition-all duration-200 hover:brightness-110">
                Go to login
              </button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <AppShell active="overview" sessions={sessions} marketItems={marketItems}>
      <Card>
        <CardHeader className="border-b border-border/60">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle>Current sessions</CardTitle>
              <CardDescription>Fast scan of active, archived, and draft lists.</CardDescription>
            </div>
            <Badge variant="secondary">{sessions.length} rows</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id ?? session.publicId ?? session.title}>
                  <TableCell>
                    <div className="font-medium text-foreground">{session.title}</div>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">{session.items}</TableCell>
                  <TableCell>
                    <Badge variant={session.active ? "default" : "secondary"}>{session.active ? "Active" : "Saved"}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{session.updated}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
