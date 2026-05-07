"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { fetchUserOrdersAction } from "./actions";
import type { WorkspaceSession } from "@/lib/pantry-types";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

type UserWithOrders = {
  id: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  role: string;
  orderCount: number;
};

export function UserOrderList({ users }: { users: UserWithOrders[] }) {
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Record<string, WorkspaceSession[]>>({});
  const [loading, setLoading] = useState<string | null>(null);

  const toggleUser = async (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }

    setExpandedUserId(userId);

    if (!orders[userId]) {
      setLoading(userId);
      try {
        const result = await fetchUserOrdersAction(userId);
        if (result.success && result.orders) {
          setOrders((prev) => ({ ...prev, [userId]: result.orders }));
        }
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      } finally {
        setLoading(null);
      }
    }
  };

  return (
    <div className="space-y-4">
      {users.map((user) => (
        <Card key={user.id} className="overflow-hidden border-border/60 bg-background/50 backdrop-blur-sm transition-all hover:bg-background/80">
          <div 
            className="flex cursor-pointer items-center justify-between p-4"
            onClick={() => toggleUser(user.id)}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.username} className="h-full w-full rounded-full object-cover" />
                ) : (
                  user.username.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{user.username}</h3>
                <p className="text-xs text-muted-foreground">{user.email || "No email"}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                {user.orderCount} Orders
              </Badge>
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                {user.role}
              </Badge>
              <div className="text-muted-foreground transition-transform duration-200" style={{ transform: expandedUserId === user.id ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                ▼
              </div>
            </div>
          </div>

          {expandedUserId === user.id && (
            <CardContent className="border-t border-border/40 bg-muted/30 p-0">
              {loading === user.id ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-xs text-muted-foreground animate-pulse">Loading orders...</p>
                </div>
              ) : orders[user.id]?.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No orders found for this user.
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {orders[user.id]?.map((order) => (
                    <Link 
                      key={order.id} 
                      href={`/order-list/${order.publicId}`}
                      className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{order.title}</span>
                          {!order.isPublic && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1 text-muted-foreground">Private</Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {order.items} • Updated {order.updated}
                        </div>
                      </div>
                      <Badge variant={order.preview === "Paid" ? "default" : "secondary"} className="text-[10px]">
                        {order.preview}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
