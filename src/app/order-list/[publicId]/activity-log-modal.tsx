"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { UndoActionButton } from "./undo-action-button";
import { Clock } from "lucide-react";

type HistoryItem = {
  id: string;
  date: string;
  item: string;
  quantity: string;
  action: string;
  rawAction?: string;
};

export function ActivityLogMobileModal({ 
  historyItems, 
  isCreator, 
  publicId 
}: { 
  historyItems: HistoryItem[], 
  isCreator: boolean, 
  publicId: string 
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2 h-8">
        <Clock className="h-4 w-4" />
        <span className="text-[10px] uppercase tracking-widest">History</span>
      </Button>

      <Dialog 
        open={open} 
        onOpenChange={setOpen}
        title="Activity Log"
        description="Recent changes to this order."
      >
        <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          <div className="relative space-y-8 pb-4 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-border/50">
            {historyItems.map((entry) => (
              <div key={entry.id} className="relative pl-7 transition-all hover:translate-x-1">
                {/* Timeline Dot */}
                <div className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-primary ring-4 ring-primary/10 shadow-sm" />
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-foreground leading-none">{entry.action}</span>
                    <span className="text-[10px] font-medium text-muted-foreground/60 whitespace-nowrap">{entry.date}</span>
                  </div>
                  <div className="text-[12px] text-muted-foreground/80">
                    <span className="font-medium text-foreground/70">{entry.item}</span>
                    <span className="mx-1.5 opacity-30">•</span>
                    <span>{entry.quantity}</span>
                  </div>
                  {isCreator && entry.rawAction === "item_remove" && (
                    <UndoActionButton publicId={publicId} auditLogId={entry.id} />
                  )}
                </div>
              </div>
            ))}
            {historyItems.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-xs text-muted-foreground italic">No history yet.</p>
              </div>
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
