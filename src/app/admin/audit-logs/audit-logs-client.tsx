"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Filter, X, Check, User, Clock, FileText, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fetchMoreAuditLogsAction } from "./actions";

type Actor = {
  _id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
};

type AuditLogEntry = {
  _id: string;
  actorId?: Actor | null;
  targetType: string;
  targetId: string;
  action: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  note?: string;
  createdAt: string;
};

type AuditLogsClientProps = {
  initialLogs: AuditLogEntry[];
  initialHasMore: boolean;
  auditUsers: Array<{ _id: string; username: string; email?: string }>;
};

const ACTION_CATEGORIES = [
  {
    category: "User Management",
    actions: [
      { id: "user_create", label: "Create User" },
      { id: "user_update", label: "Update User Info/Status" },
      { id: "user_delete", label: "Delete User" },
      { id: "user_reset_password", label: "Reset Password" },
    ],
  },
  {
    category: "Product & Category Management",
    actions: [
      { id: "product_create", label: "Add New Product" },
      { id: "product_update", label: "Update Product" },
      { id: "product_delete", label: "Delete Product" },
      { id: "product_merge", label: "Merge Products" },
      { id: "category_upsert", label: "Upsert Category" },
      { id: "price_adjust", label: "Adjust Price" },
      { id: "alias_add", label: "Add Alias" },
    ],
  },
  {
    category: "Order Transactions",
    actions: [
      { id: "item_add", label: "Add Order Item" },
      { id: "quantity_update", label: "Update Item Quantity" },
      { id: "item_remove", label: "Remove Order Item" },
      { id: "item_undo_remove", label: "Undo Remove Item" },
      { id: "order_archive", label: "Archive Order List" },
      { id: "finalize", label: "Finalize Order" },
      { id: "pay", label: "Pay Order" },
      { id: "share", label: "Share Order" },
    ],
  },
];

const ACTION_COLOR_MAP: Record<string, string> = {
  // User Management
  user_create: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  user_update: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  user_delete: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  user_reset_password: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",

  // Product & Category Management
  product_create: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  product_update: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  product_delete: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  product_merge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  category_upsert: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  price_adjust: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  alias_add: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",

  // Order Transactions
  item_add: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  quantity_update: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  item_remove: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  item_undo_remove: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  order_archive: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  finalize: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  pay: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  share: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
};

export function AuditLogsClient({ initialLogs, initialHasMore, auditUsers }: Readonly<AuditLogsClientProps>) {
  const [logs, setLogs] = useState<AuditLogEntry[]>(initialLogs);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchingFilters, setFetchingFilters] = useState(false);
  const [isInitialMount, setIsInitialMount] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showActionDropdown, setShowActionDropdown] = useState(false);

  // Filter effect (server-side filtering with debounce)
  useEffect(() => {
    if (isInitialMount) {
      setIsInitialMount(false);
      return;
    }

    const timer = setTimeout(async () => {
      setFetchingFilters(true);
      try {
        const res = await fetchMoreAuditLogsAction(1, 20, searchQuery, selectedUsers, selectedActions);
        setLogs(res.logs);
        setHasMore(res.hasMore);
        setPage(1);
      } catch (err) {
        console.error("Filter fetch error:", err);
      } finally {
        setFetchingFilters(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedUsers, selectedActions]);

  // Load more callback
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || fetchingFilters) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetchMoreAuditLogsAction(nextPage, 20, searchQuery, selectedUsers, selectedActions);
      setLogs((prev) => [...prev, ...res.logs]);
      setHasMore(res.hasMore);
      setPage(nextPage);
    } catch (err) {
      console.error("Load more error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [page, loadingMore, hasMore, fetchingFilters, searchQuery, selectedUsers, selectedActions]);

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || loadingMore || fetchingFilters) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const sentinel = document.getElementById("audit-scroll-sentinel");
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, fetchingFilters, loadMore]);

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleAction = (actionId: string) => {
    setSelectedActions((prev) =>
      prev.includes(actionId) ? prev.filter((id) => id !== actionId) : [...prev, actionId]
    );
  };

  const clearFilters = () => {
    setSelectedUsers([]);
    setSelectedActions([]);
    setSearchQuery("");
  };

  const getActionLabel = (actionId: string) => {
    for (const cat of ACTION_CATEGORIES) {
      const found = cat.actions.find((a) => a.id === actionId);
      if (found) return found.label;
    }
    return actionId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">System Audit Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Continuous scroll tracking of all administrative, user, product, and order transactions across the platform.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="relative z-30 rounded-2xl border border-border/60 bg-card/50 backdrop-blur-md p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Search by action, note, user, or target ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border/60 bg-background pl-10 pr-4 py-2 text-sm text-foreground outline-none focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Action Buttons / Active Filter Indicator */}
          <div className="flex items-center gap-2 flex-wrap">
            {(selectedUsers.length > 0 || selectedActions.length > 0 || searchQuery) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                <X size={14} className="mr-1.5" />
                Clear Filters
              </Button>
            )}
            <div className="text-xs text-muted-foreground font-medium px-2.5 py-1 bg-muted rounded-lg flex items-center gap-1.5">
              {fetchingFilters && <Loader2 size={12} className="animate-spin text-primary" />}
              <span>Showing {logs.length} entries</span>
            </div>
          </div>
        </div>

        {/* Multi-Select Dropdowns & Category Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-wrap pt-2 border-t border-border/40">
          {/* Filter by Actor */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowUserDropdown(!showUserDropdown);
                setShowActionDropdown(false);
              }}
              className={cn("rounded-xl border-border/60 gap-2 font-normal", selectedUsers.length > 0 && "border-primary bg-primary/5 text-primary font-medium")}
            >
              <User size={15} />
              <span>Filter by Actor {selectedUsers.length > 0 && `(${selectedUsers.length})`}</span>
              <ChevronDown size={14} className="text-muted-foreground" />
            </Button>

            {showUserDropdown && (
              <div className="absolute left-0 top-full mt-2 w-72 rounded-xl border border-border/80 bg-popover p-2 shadow-xl z-50 max-h-64 overflow-y-auto">
                <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Select Users
                </div>
                {auditUsers.length === 0 ? (
                  <div className="p-2 text-xs text-muted-foreground">No users found in logs</div>
                ) : (
                  auditUsers.map((u) => {
                    const isSelected = selectedUsers.includes(u._id);
                    return (
                      <button
                        key={u._id}
                        onClick={() => toggleUser(u._id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-muted",
                          isSelected && "bg-primary/10 font-semibold text-primary hover:bg-primary/15"
                        )}
                      >
                        <div>
                          <div className="font-medium">{u.username}</div>
                          {u.email && <div className="text-[10px] text-muted-foreground">{u.email}</div>}
                        </div>
                        {isSelected && <Check size={14} />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Filter by Action (Categorized Multi-Select) */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowActionDropdown(!showActionDropdown);
                setShowUserDropdown(false);
              }}
              className={cn("rounded-xl border-border/60 gap-2 font-normal", selectedActions.length > 0 && "border-primary bg-primary/5 text-primary font-medium")}
            >
              <Filter size={15} />
              <span>Filter by Action {selectedActions.length > 0 && `(${selectedActions.length})`}</span>
              <ChevronDown size={14} className="text-muted-foreground" />
            </Button>

            {showActionDropdown && (
              <div className="absolute left-0 top-full mt-2 w-80 rounded-xl border border-border/80 bg-popover p-2 shadow-xl z-50 max-h-80 overflow-y-auto space-y-3">
                {ACTION_CATEGORIES.map((cat) => (
                  <div key={cat.category} className="space-y-1">
                    <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/50 rounded">
                      {cat.category}
                    </div>
                    {cat.actions.map((act) => {
                      const isSelected = selectedActions.includes(act.id);
                      return (
                        <button
                          key={act.id}
                          onClick={() => toggleAction(act.id)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted",
                            isSelected && "bg-primary/10 font-semibold text-primary hover:bg-primary/15"
                          )}
                        >
                          <span>{act.label}</span>
                          {isSelected && <Check size={14} />}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Filter Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {selectedUsers.map((userId) => {
              const u = auditUsers.find((user) => user._id === userId);
              return (
                <span key={userId} className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  <span>User: {u?.username || userId}</span>
                  <button onClick={() => toggleUser(userId)} className="hover:text-primary/70">
                    <X size={12} />
                  </button>
                </span>
              );
            })}
            {selectedActions.map((actId) => (
              <span key={actId} className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <span>Action: {getActionLabel(actId)}</span>
                <button onClick={() => toggleAction(actId)} className="hover: text-primary/70">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Results Table / Feed */}
      <div className="relative z-10 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        {fetchingFilters ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <Loader2 size={32} className="animate-spin text-primary mb-3" />
            <h3 className="text-base font-semibold">Filtering audit logs...</h3>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="rounded-full bg-muted p-4 text-muted-foreground mb-3">
              <FileText size={32} />
            </div>
            <h3 className="text-lg font-semibold">No audit logs found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              No transactions match your current search and filter criteria. Try clearing your filters or adjusting your search query.
            </p>
            {(selectedUsers.length > 0 || selectedActions.length > 0 || searchQuery) && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4 rounded-xl">
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3.5 pl-6 pr-4">Timestamp</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Target</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 pl-4 pr-6">Transaction Details & Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-card/50 backdrop-blur-sm">
                {logs.map((log) => {
                  const dateObj = new Date(log.createdAt);
                  const dateStr = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                  const timeStr = dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

                  const actionColor = ACTION_COLOR_MAP[log.action] || "bg-muted text-muted-foreground border-border";

                  return (
                    <tr key={log._id} className="hover:bg-muted/30 transition-colors group">
                      {/* Timestamp */}
                      <td className="py-4 pl-6 pr-4 whitespace-nowrap align-top">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                          <Clock size={13} className="text-muted-foreground" />
                          <span>{dateStr}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground pl-4 mt-0.5">{timeStr}</div>
                      </td>

                      {/* Actor */}
                      <td className="py-4 px-4 whitespace-nowrap align-top">
                        {log.actorId ? (
                          <div>
                            <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary uppercase">
                                {log.actorId.username.charAt(0)}
                              </span>
                              <span>{log.actorId.username}</span>
                            </div>
                            {log.actorId.email && (
                              <div className="text-[11px] text-muted-foreground pl-6 mt-0.5">{log.actorId.email}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">System / Anonymous</span>
                        )}
                      </td>

                      {/* Target */}
                      <td className="py-4 px-4 whitespace-nowrap align-top">
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {log.targetType}
                        </div>
                        <div className="text-xs font-mono text-foreground mt-0.5 truncate max-w-[150px]" title={log.targetId}>
                          {log.targetId}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-4 px-4 whitespace-nowrap align-top">
                        <span className={cn("inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold shadow-2xs", actionColor)}>
                          {getActionLabel(log.action)}
                        </span>
                      </td>

                      {/* Details & Notes */}
                      <td className="py-4 pl-4 pr-6 align-top min-w-[280px]">
                        <div className="text-xs text-foreground font-medium">{log.note || "No notes provided."}</div>
                        {(log.before || log.after) && (
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-background/50 rounded-xl p-2.5 border border-border/40 text-[11px] font-mono overflow-x-auto">
                            {log.before && (
                              <div className="space-y-1 pr-2 border-b sm:border-b-0 sm:border-r border-border/40 pb-2 sm:pb-0">
                                <div className="font-bold text-red-500/80 uppercase tracking-wider text-[9px]">Before Change:</div>
                                <pre className="text-muted-foreground whitespace-pre-wrap overflow-x-auto">
                                  {JSON.stringify(log.before, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.after && (
                              <div className="space-y-1 pl-1">
                                <div className="font-bold text-emerald-500/80 uppercase tracking-wider text-[9px]">After Change:</div>
                                <pre className="text-muted-foreground whitespace-pre-wrap overflow-x-auto">
                                  {JSON.stringify(log.after, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Infinite Scroll Sentinel / Loading Indicator */}
        {hasMore && (
          <div id="audit-scroll-sentinel" className="flex items-center justify-center py-8 bg-card/30">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Loading more audit logs...</span>
            </div>
          </div>
        )}

        {!hasMore && logs.length > 0 && (
          <div className="py-8 text-center text-xs text-muted-foreground bg-card/30 border-t border-border/40">
            You have reached the end of the audit log history.
          </div>
        )}
      </div>
    </div>
  );
}
