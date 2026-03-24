import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Archive } from "lucide-react";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import CreateProjectDialog from "@/components/projects/CreateProjectDialog";
import { toast } from "sonner";
import { useRole } from "@/hooks/useRole";

const statusColors: Record<string, string> = {
  active: "bg-success/15 text-foreground", completed: "bg-muted text-muted-foreground",
  paused: "bg-warning/15 text-warning-foreground", planning: "bg-info/15 text-info-foreground",
};

export default function Projects() {
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { isAdmin } = useRole();

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

  const handleArchive = async (e: React.MouseEvent, projectId: string, projectName: string) => {
    e.stopPropagation();
    if (!confirm(`Archiwizować projekt "${projectName}" wraz z otwartymi zadaniami?`)) return;
    const { error } = await supabase.rpc("archive_project_with_tasks", { p_project_id: projectId });
    if (error) { toast.error("Błąd archiwizacji", { description: error.message }); return; }
    toast.success(`Projekt "${projectName}" zarchiwizowano`);
    refetch();
  };

  return (
    <AppLayout title="Projekty">
      <div className="space-y-4 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Wszystkie projekty</h2>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/projects/archive"><Archive className="h-4 w-4 mr-1" /> Archiwum</Link>
            </Button>
            <Button onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Nowy projekt</Button>
          </div>
          <CreateProjectDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} onCreated={() => refetch()} />
        </div>

        <div className="bg-card rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Projekt</TableHead>
                <TableHead>Klient</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Utworzono</TableHead>
                {isAdmin && <TableHead className="w-[80px]"></TableHead>}
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
                    {isAdmin && (
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => handleArchive(e, p.id, p.name)} title="Archiwizuj">
                          <Archive className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
