import Link from "next/link";

import { auth } from "@/auth";
import { AppShell } from "../../components/app-shell";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { getMarketItems, getOverviewSessions } from "../../lib/pantry-db";

export default async function MarketListPage() {
  const session = await auth();
  const [marketItems, sessions] = await Promise.all([getMarketItems(), getOverviewSessions()]);

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>Log in before opening the market list.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/login"
              className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-transparent bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-[0_12px_30px_-14px_rgba(45,212,191,0.75)] transition-all duration-200 hover:brightness-110"
            >
              Go to login
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <AppShell active="market" marketItems={marketItems} sessions={sessions}>
      <Card>
        <CardHeader className="border-b border-border/60">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle>Current market list</CardTitle>
              <CardDescription>Track price, freshness, and storage status.</CardDescription>
            </div>
            <Badge variant="secondary">{marketItems.length} rows</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {marketItems.map((item) => (
                <TableRow key={item.id ?? item.name}>
                  <TableCell>
                    <div className="font-medium text-foreground">{item.name}</div>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">{item.price}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === "Fresh" ? "default" : "secondary"}>{item.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.note}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">
                      Archive
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
