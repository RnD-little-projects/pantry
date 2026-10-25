import { auth } from "@/auth";
import { PantryLayout } from "../../components/pantry-layout";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { getMarketItems, getOverviewSessions } from "../../lib/pantry-db";
import { redirect } from "next/navigation";

export default async function MarketListPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const [marketItems, sessions] = await Promise.all([
    getMarketItems(), 
    getOverviewSessions((session.user as Record<string, unknown>).id as string | undefined)
  ]);

  return (
    <PantryLayout active="market" marketItems={marketItems} sessions={sessions} userRole={(session.user as Record<string, unknown>).role as string | undefined} user={session.user as any}>
      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-2xl">Market prices</CardTitle>
              <CardDescription>What each item costs today.</CardDescription>
            </div>
            <Badge variant="secondary">{marketItems.length} items</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0 pb-2">
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
                    <div className="font-semibold text-foreground">{item.name}</div>
                  </TableCell>
                  <TableCell><span className={item.price === "Pending" ? "sticker sticker-empty text-sm" : "sticker text-sm"}>{item.price}</span></TableCell>
                  <TableCell>
                    <Badge variant={item.status === "Active" ? "success" : "secondary"}>{item.status}</Badge>
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
    </PantryLayout>
  );
}
