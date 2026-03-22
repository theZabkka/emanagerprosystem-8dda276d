import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Archive, ExternalLink, Search } from "lucide-react";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

export default function TaskArchive() {
  const [clientFilter, setClientFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");

  // Fetch closed tasks
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["archived-tasks"],
    queryFn: async () => {

      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, description, client_id, project_id, updated_at, due_date, status, clients(name), projects(name), task_assignments(user_id, role, profiles:user_id(full_name))")
        .eq("is_archived", true)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((t: any) => ({
        ...t,
        client_name: t.clients?.name || null,
        project_name: t.projects?.name || null,
        assignee_name: t.task_assignments?.find((a: any) => a.role === "primary")?.profiles?.full_name || null,
      }));
    },
  });

  // Fetch clients and projects for filters
  const { data: clients } = useQuery({
    queryKey: ["archive-clients"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: allProjects } = useQuery({
    queryKey: ["archive-projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name, client_id").order("name");
      return data || [];
    },
  });

  // Filter projects based on selected client
  const filteredProjects = useMemo(() => {
    if (!allProjects) return [];
    if (clientFilter === "all") return allProjects;
    return allProjects.filter((p: any) => p.client_id === clientFilter);
  }, [allProjects, clientFilter]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    let result = tasks;
    if (clientFilter !== "all") result = result.filter((t: any) => t.client_id === clientFilter);
    if (projectFilter !== "all") result = result.filter((t: any) => t.project_id === projectFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((t: any) =>
        t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [tasks, clientFilter, projectFilter, searchQuery]);

  // Reset project filter when client changes
  const handleClientChange = (value: string) => {
    setClientFilter(value);
    setProjectFilter("all");
  };

  return (
    <AppLayout title="Archiwum zadań">
      <div className="space-y-4 max-w-6xl mx-auto">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Archive className="h-5 w-5 text-muted-foreground" />
              Archiwum zamkniętych zadań
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex gap-3 flex-wrap items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Szukaj zadań..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 w-[250px]"
                />
              </div>
              <Select value={clientFilter} onValueChange={handleClientChange}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Wybierz klienta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszyscy klienci</SelectItem>
                  {clients?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Wybierz projekt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie projekty</SelectItem>
                  {filteredProjects.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            {isLoading ? (
              <TableSkeleton columns={6} rows={6} />
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Archive className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Brak zamkniętych zadań{clientFilter !== "all" || projectFilter !== "all" ? " dla wybranych filtrów" : ""}.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">ID</TableHead>
                      <TableHead>Nazwa zadania</TableHead>
                      <TableHead>Klient</TableHead>
                      <TableHead>Projekt</TableHead>
                      <TableHead>Osoba przypisana</TableHead>
                      <TableHead>Data zamknięcia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task: any) => (
                      <TableRow key={task.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {task.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          <Link to={`/tasks/${task.id}`} className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                            {task.title}
                            <ExternalLink className="h-3 w-3 opacity-50" />
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm">{task.client_name || "—"}</TableCell>
                        <TableCell className="text-sm">{task.project_name || "—"}</TableCell>
                        <TableCell className="text-sm">{task.assignee_name || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {task.updated_at ? new Date(task.updated_at).toLocaleDateString("pl-PL") : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Wyświetlono {filteredTasks.length} zamkniętych zadań
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
