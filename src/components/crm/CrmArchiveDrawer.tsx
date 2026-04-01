import { useState } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { ArchiveRestore, Eye } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCrmDeals, useCrmMutations, type CrmDeal } from "@/hooks/useCrmData";
import { CrmDealDetailPanel } from "./CrmDealDetailPanel";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CrmArchiveDrawer({ open, onClose }: Props) {
  const { data: archivedDeals = [] } = useCrmDeals(true);
  const { restoreDeal } = useCrmMutations();
  const [viewingDeal, setViewingDeal] = useState<CrmDeal | null>(null);

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="p-6 pb-4 border-b border-border">
            <SheetTitle>Archiwum ({archivedDeals.length})</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 p-4">
            {archivedDeals.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Brak zarchiwizowanych kart</p>
            )}
            <div className="space-y-2">
              {archivedDeals.map((d) => (
                <div key={d.id} className="flex items-center justify-between bg-card border border-border rounded-lg p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{d.title}</p>
                    <span className="text-[11px] text-muted-foreground">
                      {d.created_at ? format(new Date(d.created_at), "d MMM yyyy", { locale: pl }) : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setViewingDeal(d)}
                      title="Podgląd szczegółów"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => restoreDeal.mutate(d.id, {
                        onSuccess: () => toast.success("Karta przywrócona"),
                      })}
                    >
                      <ArchiveRestore className="h-3.5 w-3.5 mr-1" />
                      Przywróć
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Read-only detail view for archived card */}
      <CrmDealDetailPanel
        deal={viewingDeal}
        open={!!viewingDeal}
        onClose={() => setViewingDeal(null)}
        readOnly
      />
    </>
  );
}
