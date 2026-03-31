import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Plus, Archive, Search, RotateCcw, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import CreateProjectDialog from "@/components/projects/CreateProjectDialog";
import { toast } from "sonner";
import { useRole } from "@/hooks/useRole";

const statusColors: Record<string, string> = {
  active: "bg-success/15 text-foreground", completed: "bg-muted text-muted-foreground",
  paused: "bg-warning/15 text-warning-foreground", planning: "bg-info/15 text-info-foreground",
};

export default function Projects() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { currentRole } = useRole();
  const canArchive = ["superadmin", "boss", "koordynator"].includes(currentRole);

  // Active projects — always loaded
  const { data: projects, isLoading, refetch } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("*, clients(name), profiles:manager_id(full_name)")
        .eq("is_archived", false)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Archived projects — LAZY: only fetched when archive tab is active
  const { data: archivedProjects, isLoading: isArchiveLoading } = useQuery({
    queryKey: ["archived-projects"],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("*, clients(name), profiles:manager_id(full_name)")
        .eq("is_archived", true)
        .order("archived_at", { ascending: false });
      return data || [];
    },
    enabled: activeTab === "archive",
  });

  const filteredArchive = useMemo(() => {
    if (!archivedProjects) return [];
    if (!archiveSearch.trim()) return archivedProjects;
    const q = archiveSearch.toLowerCase().trim();
    return archivedProjects.filter((p: any) =>
      p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    );
  }, [archivedProjects, archiveSearch]);

  const handleArchive = async (e: React.MouseEvent, projectId: string, projectName: string) => {
    e.stopPropagation();
    if (!confirm(`Archiwizować projekt "${projectName}" wraz z otwartymi zadaniami?`)) return;
    const { error } = await supabase.rpc("archive_project_with_tasks", { p_project_id: projectId });
    if (error) { toast.error("Błąd archiwizacji", { description: error.message }); return; }
    toast.success(`Projekt "${projectName}" zarchiwizowano`);
    refetch();
    queryClient.invalidateQueries({ queryKey: ["archived-projects"] });
  };

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

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string, projectName: string) => {
    e.stopPropagation();
    setDeletingId(projectId);
    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    if (error) {
      toast.error("Błąd usuwania: " + error.message);
      setDeletingId(null);
      return;
    }
    toast.success(`Pomyślnie usunięto projekt "${projectName}"`);
    refetch();
    queryClient.invalidateQueries({ queryKey: ["archived-projects"] });
    setDeletingId(null);
  };

  return (
    <AppLayout title="Projekty">
      <div className="space-y-4 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Projekty</h2>
          <div className="flex gap-2">
            <Button onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Nowy projekt</Button>
          </div>
          <CreateProjectDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} onCreated={() => refetch()} />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="active">
              Aktywne
              {projects && <span className="ml-1.5 text-xs bg-background px-1.5 py-0.5 rounded-full">{projects.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="archive">
              <Archive className="h-3.5 w-3.5 mr-1" />
              Archiwum
              {archivedProjects && <span className="ml-1.5 text-xs bg-background px-1.5 py-0.5 rounded-full">{archivedProjects.length}</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <div className="bg-card rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Projekt</TableHead>
                    <TableHead>Klient</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Utworzono</TableHead>
                    {canArchive && <TableHead className="w-[120px]">Akcje</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="p-0 border-0"><TableSkeleton columns={6} rows={5} /></TableCell></TableRow>
                  ) : (projects || []).length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Brak projektów</TableCell></TableRow>
                  ) : (
                    projects?.map((p: any) => (
                      <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/projects/${p.id}`)}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{p.name}</p>
                            {p.description && <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{p.clients?.name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`text-xs ${statusColors[p.status] || ""}`}>{p.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{p.profiles?.full_name || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pl-PL")}</TableCell>
                        {canArchive && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-warning" onClick={(e) => handleArchive(e, p.id, p.name)} title="Archiwizuj">
                                <Archive className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => e.stopPropagation()} title="Usuń">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Trwałe usunięcie projektu</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Czy na pewno chcesz trwale usunąć projekt <strong>"{p.name}"</strong> wraz ze wszystkimi zadaniami? Tej operacji nie można cofnąć.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                    <AlertDialogAction onClick={(e) => handleDeleteProject(e, p.id, p.name)} disabled={deletingId === p.id} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                      {deletingId === p.id ? "Usuwanie..." : "Tak, usuń"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="archive">
            <div className="space-y-3">
              <div className="relative w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Szukaj w archiwum..."
                  value={archiveSearch}
                  onChange={e => setArchiveSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="bg-card rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Projekt</TableHead>
                      <TableHead>Klient</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Data archiwizacji</TableHead>
                      {canArchive && <TableHead className="w-[120px]">Akcje</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isArchiveLoading ? (
                      <TableRow><TableCell colSpan={5} className="p-0 border-0"><TableSkeleton columns={5} rows={5} /></TableCell></TableRow>
                    ) : filteredArchive.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        <Archive className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        Brak zarchiwizowanych projektów{archiveSearch ? " dla tego wyszukiwania" : ""}
                      </TableCell></TableRow>
                    ) : (
                      filteredArchive.map((p: any) => (
                        <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/projects/${p.id}`)}>
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
                          {canArchive && (
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={restoringId === p.id}
                                onClick={(e) => { e.stopPropagation(); handleRestore(p.id, p.name); }}
                                className="gap-1"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Przywróć
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                Wyświetlono {filteredArchive.length} zarchiwizowanych projektów
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
