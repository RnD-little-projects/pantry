import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLatestOrderPublicId, getOverviewSessions, getMarketItems } from "@/lib/pantry-db";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { startOrderAction } from "./new-order-action";

type HomeProps = {
  searchParams?: Promise<{
    new?: string;
  }>;
};

export default async function Home({ searchParams }: Readonly<HomeProps>) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const resolvedSearchParams = await searchParams;
  const isExplicitNew = resolvedSearchParams?.new === "true";

  const publicId = await getLatestOrderPublicId((session?.user as any)?.id);
  
  // If user has orders and didn't explicitly click "New Session", redirect to latest
  if (publicId && !isExplicitNew) {
    redirect(`/order-list/${publicId}`);
  }

  const [sessions, marketItems] = await Promise.all([
    getOverviewSessions(),
    getMarketItems(),
  ]);

  return (
    <AppShell active="overview" sessions={sessions} marketItems={marketItems}>
      <div className="space-y-8 rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <Card className="border-border/60 bg-background/80">
          <CardHeader className="border-b border-border/60">
            <div>
              <CardTitle>Start a fresh order</CardTitle>
              <CardDescription>Add your first item to begin a new private session.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <form action={startOrderAction}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Quantity (e.g. 5kg, 2 doz)</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <input
                        name="itemName"
                        placeholder="What do you need?"
                        required
                        className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                        autoFocus
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        name="quantity"
                        placeholder="How much?"
                        required
                        className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button type="submit" size="sm">
                        Create Order
                      </Button>
                    </TableCell>
                  </TableRow>
                  {/* Empty state placeholder rows */}
                  {[1, 2, 3].map((i) => (
                    <TableRow key={i} className="opacity-20 select-none pointer-events-none">
                      <TableCell className="h-12"></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
