import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Archive, Search, RotateCcw } from "lucide-react";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { toast } from "sonner";

export default function ProjectArchive() {
  const [searchQuery, setSearchQuery] = useState("");
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["archived-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, clients(name), profiles:manager_id(full_name)")
        .eq("is_archived", true)
        .order("archived_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    if (!projects) return [];
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase().trim();
    return projects.filter((p: any) =>
      p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    );
  }, [projects, searchQuery]);

  const handleRestore = async (projectId: string, projectName: string) => {
    if (!confirm(`Przywrócić projekt "${projectName}" wraz z zadaniami zarchiwizowanymi w tym samym momencie?`)) return;
    setRestoringId(projectId);
    try {
      const { error } = await supabase.rpc("restore_project_with_tasks", { p_project_id: projectId });
      if (error) throw error;
      toast.success(`Projekt "${projectName}" przywrócony`);
      queryClient.invalidateQueries({ queryKey: ["archived-projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    } catch (err: any) {
      toast.error("Błąd przywracania", { description: err.message });
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <AppLayout title="Archiwum projektów">
      <div className="space-y-4 max-w-6xl mx-auto">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Archive className="h-5 w-5 text-muted-foreground" />
              Archiwum projektów
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Szukaj projektów..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {isLoading ? (
              <TableSkeleton columns={5} rows={5} />
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Archive className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Brak zarchiwizowanych projektów{searchQuery ? " dla tego wyszukiwania" : ""}.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Projekt</TableHead>
                      <TableHead>Klient</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Data archiwizacji</TableHead>
                      <TableHead className="w-[120px]">Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{p.name}</p>
                            {p.description && <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{p.clients?.name || "—"}</TableCell>
                        <TableCell className="text-sm">{p.profiles?.full_name || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.archived_at ? new Date(p.archived_at).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={restoringId === p.id}
                            onClick={() => handleRestore(p.id, p.name)}
                            className="gap-1"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Przywróć
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Wyświetlono {filtered.length} zarchiwizowanych projektów
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
