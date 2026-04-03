import { useState } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { ArchiveRestore } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCrmDeals, useCrmMutations, type CrmDeal } from "@/hooks/useCrmData";
import { CrmDealDetailPanel } from "./CrmDealDetailPanel";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CrmArchiveDrawer({ open, onClose }: Props) {
  const { data: archivedDeals = [] } = useCrmDeals(true);
  const { restoreDeal } = useCrmMutations();
  const [selectedDeal, setSelectedDeal] = useState<CrmDeal | null>(null);

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
                <div
                  key={d.id}
                  className="flex items-center justify-between bg-card border border-border rounded-lg p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setSelectedDeal(d)}
                >
                  <div>
                    <p className="text-sm font-medium">{d.title}</p>
                    <span className="text-[11px] text-muted-foreground">
                      {d.created_at ? format(new Date(d.created_at), "d MMM yyyy", { locale: pl }) : ""}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); restoreDeal.mutate(d.id); }}
                  >
                    <ArchiveRestore className="h-3.5 w-3.5 mr-1" />
                    Przywróć
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <CrmDealDetailPanel
        deal={selectedDeal}
        open={!!selectedDeal}
        onClose={() => setSelectedDeal(null)}
        readOnly
      />
    </>
  );
}
