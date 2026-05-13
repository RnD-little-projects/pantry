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

  const [marketItems, sessions] = await Promise.all([getMarketItems(), getOverviewSessions()]);

  return (
    <PantryLayout active="market" marketItems={marketItems} sessions={sessions} userRole={(session.user as any).role}>
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
                    <Badge variant={item.status === "Active" ? "default" : "secondary"}>{item.status}</Badge>
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
