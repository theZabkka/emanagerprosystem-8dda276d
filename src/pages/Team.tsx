import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, Users, CheckSquare, Clock, AlertTriangle, UserPlus, Trash2 } from "lucide-react";
import { useState } from "react";
import CreateStaffDialog from "@/components/team/CreateStaffDialog";
import { toast } from "sonner";

export default function Team() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const STAFF_ROLES = ["superadmin", "boss", "koordynator", "specjalista", "praktykant"];

  const { data: profiles = [] } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, department, status, avatar_url, created_at")
        .in("role", STAFF_ROLES)
        .order("full_name");
      return (data || []).filter(p => p.status !== "inactive");
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["team-tasks-stats"],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("id, status, priority, due_date, created_by").not("status", "in", "(done,cancelled)");
      return data || [];
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["team-assignments-stats"],
    queryFn: async () => {
      const { data } = await supabase.from("task_assignments").select("task_id, user_id, role");
      return data || [];
    },
  });

  const filtered = profiles.filter((p) =>
    (p.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.department || "").toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name: string | null) =>
    name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "?";

  const getUserTaskCount = (userId: string) => {
    const taskIds = assignments.filter(a => a.user_id === userId).map(a => a.task_id);
    return tasks.filter(t => taskIds.includes(t.id) || t.created_by === userId).length;
  };

  const getUserInProgress = (userId: string) => {
    const taskIds = assignments.filter(a => a.user_id === userId).map(a => a.task_id);
    return tasks.filter(t => (taskIds.includes(t.id) || t.created_by === userId) && t.status === "in_progress").length;
  };

  const getUserOverdue = (userId: string) => {
    const taskIds = assignments.filter(a => a.user_id === userId).map(a => a.task_id);
    return tasks.filter(t => (taskIds.includes(t.id) || t.created_by === userId) && t.due_date && new Date(t.due_date) < new Date()).length;
  };

  return (
    <AppLayout title="Zespół">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Users className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold text-foreground">{profiles.length}</p><p className="text-sm text-muted-foreground">Członków zespołu</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckSquare className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold text-foreground">{tasks.length}</p><p className="text-sm text-muted-foreground">Otwartych zadań</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Clock className="h-8 w-8 text-warning" /><div><p className="text-2xl font-bold text-foreground">{tasks.filter(t => t.status === "in_progress").length}</p><p className="text-sm text-muted-foreground">W trakcie</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold text-foreground">{tasks.filter(t => t.due_date && new Date(t.due_date) < new Date()).length}</p><p className="text-sm text-muted-foreground">Zaległe</p></div></div></CardContent></Card>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Szukaj członka zespołu..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Badge variant="secondary"><Users className="h-3 w-3 mr-1" />{filtered.length} osób</Badge>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Dodaj pracownika
          </Button>
        </div>

        <CreateStaffDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ["team-members"] })}
        />

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Osoba</TableHead><TableHead>E-mail</TableHead><TableHead>Rola</TableHead><TableHead>Dział</TableHead><TableHead>Status</TableHead><TableHead className="text-center">Zadania</TableHead><TableHead className="text-center">W trakcie</TableHead><TableHead className="text-center">Zaległe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell><div className="flex items-center gap-2"><Avatar className="h-8 w-8"><AvatarFallback className="bg-primary text-primary-foreground text-xs">{getInitials(p.full_name)}</AvatarFallback></Avatar><span className="font-medium text-foreground">{p.full_name || "—"}</span></div></TableCell>
                    <TableCell className="text-muted-foreground">{p.email || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{p.role || "user"}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{p.department || "—"}</TableCell>
                    <TableCell><Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status === "active" ? "Aktywny" : p.status || "—"}</Badge></TableCell>
                    <TableCell className="text-center font-medium">{getUserTaskCount(p.id)}</TableCell>
                    <TableCell className="text-center font-medium">{getUserInProgress(p.id)}</TableCell>
                    <TableCell className="text-center">{getUserOverdue(p.id) > 0 ? <span className="text-destructive font-bold">{getUserOverdue(p.id)}</span> : <span className="text-muted-foreground">0</span>}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Brak wyników</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
