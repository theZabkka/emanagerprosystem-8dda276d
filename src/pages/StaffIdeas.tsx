import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

const statuses = [
  { value: "new", label: "Nowy" },
  { value: "reviewed", label: "Rozpatrzony" },
  { value: "accepted", label: "Zaakceptowany" },
  { value: "rejected", label: "Odrzucony" },
];

const statusColors: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-700",
  reviewed: "bg-amber-500/15 text-amber-700",
  accepted: "bg-emerald-500/15 text-emerald-700",
  rejected: "bg-red-500/15 text-red-700",
};

export default function StaffIdeas() {
  const queryClient = useQueryClient();
  const [selectedIdea, setSelectedIdea] = useState<any>(null);

  const { data: ideas, isLoading } = useQuery({
    queryKey: ["all-client-ideas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_ideas")
        .select("*, clients:client_id(name), profiles:created_by(full_name)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("client_ideas").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-client-ideas"] });
      toast.success("Status zaktualizowany");
    },
  });

  return (
    <AppLayout title="Pomysły klientów">
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h2 className="text-xl font-bold text-foreground">Pomysły klientów</h2>
          <p className="text-sm text-muted-foreground">Przegląd wszystkich zgłoszonych pomysłów i sugestii od klientów.</p>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="p-6 text-sm text-muted-foreground">Ładowanie...</p>
            ) : ideas && ideas.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tytuł</TableHead>
                    <TableHead>Klient</TableHead>
                    <TableHead>Zgłosił</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ideas.map((idea: any) => (
                    <TableRow
                      key={idea.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedIdea(idea)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{idea.title}</p>
                          {idea.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{idea.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{idea.clients?.name || "—"}</TableCell>
                      <TableCell className="text-sm">{idea.profiles?.full_name || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(idea.created_at).toLocaleDateString("pl-PL")}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={idea.status}
                          onValueChange={(v) => updateStatus.mutate({ id: idea.id, status: v })}
                        >
                          <SelectTrigger className={`h-7 w-[130px] text-xs font-medium border ${statusColors[idea.status] || ""}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statuses.map(s => (
                              <SelectItem key={s.value} value={s.value} className="text-xs">
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="p-6 text-sm text-muted-foreground text-center">Brak zgłoszonych pomysłów.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Idea Detail Sheet */}
      <Sheet open={!!selectedIdea} onOpenChange={(open) => !open && setSelectedIdea(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selectedIdea?.title}</SheetTitle>
          </SheetHeader>
          {selectedIdea && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-xs ${statusColors[selectedIdea.status] || ""}`}>
                  {statuses.find(s => s.value === selectedIdea.status)?.label || selectedIdea.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(selectedIdea.created_at).toLocaleDateString("pl-PL")}
                </span>
              </div>

              <Separator />

              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Klient</p>
                <p className="text-sm text-foreground">{selectedIdea.clients?.name || "—"}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Zgłosił</p>
                <p className="text-sm text-foreground">{selectedIdea.profiles?.full_name || "—"}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Głosy</p>
                <p className="text-sm text-foreground font-semibold">{selectedIdea.votes || 0}</p>
              </div>

              <Separator />

              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Opis</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {selectedIdea.description || "Brak opisu."}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Zmień status</p>
                <Select
                  value={selectedIdea.status}
                  onValueChange={(v) => {
                    updateStatus.mutate({ id: selectedIdea.id, status: v });
                    setSelectedIdea({ ...selectedIdea, status: v });
                  }}
                >
                  <SelectTrigger className={`h-9 w-full text-sm font-medium border ${statusColors[selectedIdea.status] || ""}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map(s => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
