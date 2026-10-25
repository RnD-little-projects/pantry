"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { UndoActionButton } from "./undo-action-button";
import { History } from "lucide-react";

type HistoryItem = {
  id: string;
  date: string;
  item: string;
  quantity: string;
  action: string;
  rawAction?: string;
  isAdminRemove?: boolean;
};

export function ActivityLogMobileModal({ 
  historyItems, 
  isCreator, 
  isAdmin,
  publicId 
}: { 
  historyItems: HistoryItem[], 
  isCreator: boolean, 
  isAdmin?: boolean,
  publicId: string 
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Activity"
        title="Activity"
        onClick={() => setOpen(true)}
        className="-mr-2 text-band-foreground hover:bg-band-foreground/15"
      >
        <History aria-hidden="true" className="h-5 w-5" />
      </Button>

      <Dialog 
        open={open} 
        onOpenChange={setOpen}
        title="Activity"
        description="Every change to this list, newest first."
      >
        <div className="max-h-[60dvh] overflow-y-auto overscroll-contain pr-2 custom-scrollbar">
          <div className="relative space-y-8 pb-4 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border">
            {historyItems.map((entry) => (
              <div key={entry.id} className="relative pl-7">
                {/* Timeline Dot */}
                <div className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-primary" />
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">{entry.action}</span>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">{entry.date}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="text-foreground">{entry.item}</span>
                    <span className="mx-1.5 opacity-30">•</span>
                    <span>{entry.quantity}</span>
                  </div>
                  {(entry.isAdminRemove ? isAdmin : isCreator) && entry.rawAction === "item_remove" && (
                    <UndoActionButton publicId={publicId} auditLogId={entry.id} />
                  )}
                </div>
              </div>
            ))}
            {historyItems.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-sm text-muted-foreground">Changes to this list show up here.</p>
              </div>
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
