import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useDataSource } from "@/hooks/useDataSource";
import { mockProjects, mockClients, mockProfiles } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  active: "bg-success/15 text-foreground", completed: "bg-muted text-muted-foreground",
  paused: "bg-warning/15 text-warning-foreground", planning: "bg-info/15 text-info-foreground",
};

function getDemoProjects() {
  return mockProjects.map(p => ({
    ...p,
    clients: mockClients.find(c => c.id === p.client_id) ? { name: mockClients.find(c => c.id === p.client_id)!.name } : null,
    profiles: mockProfiles.find(u => u.id === p.manager_id) ? { full_name: mockProfiles.find(u => u.id === p.manager_id)!.full_name } : null,
  }));
}

export default function Projects() {
  const { isDemo } = useDataSource();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", client_id: "", status: "active" });

  const { data: projects, isLoading, refetch } = useQuery({
    queryKey: ["projects", isDemo],
    queryFn: async () => {
      if (isDemo) return getDemoProjects();
      const { data } = await supabase
        .from("projects")
        .select("*, clients(name), profiles:manager_id(full_name)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["clients-list", isDemo],
    queryFn: async () => {
      if (isDemo) return mockClients.map(c => ({ id: c.id, name: c.name }));
      const { data } = await supabase.from("clients").select("id, name").order("name");
      return data || [];
    },
  });

  async function handleCreate() {
    if (!form.name.trim()) { toast.error("Podaj nazwę projektu"); return; }
    if (isDemo) { toast.info("W trybie demo nie można tworzyć projektów"); return; }
    const { error } = await supabase.from("projects").insert({
      name: form.name, description: form.description,
      client_id: form.client_id || null, status: form.status,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Projekt utworzony");
    setForm({ name: "", description: "", client_id: "", status: "active" });
    setIsCreateOpen(false);
    refetch();
  }

  return (
    <AppLayout title="Projekty">
      <div className="space-y-4 max-w-7xl mx-auto">
        {isDemo && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary">
            🎭 Tryb demo — wyświetlane są przykładowe dane.
            <a href="/settings" className="underline font-medium ml-1">Zmień w Ustawieniach</a>
          </div>
        )}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Wszystkie projekty</h2>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Nowy projekt</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nowy projekt</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Nazwa *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Opis</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Klient</Label>
                  <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Wybierz klienta" /></SelectTrigger>
                    <SelectContent>
                      {clients?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} className="w-full">Utwórz projekt</Button>
              </div>
            </DialogContent>
          </Dialog>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Ładowanie...</TableCell></TableRow>
              ) : (projects || []).length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Brak projektów</TableCell></TableRow>
              ) : (
                projects?.map((p: any) => (
                  <TableRow key={p.id}>
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
