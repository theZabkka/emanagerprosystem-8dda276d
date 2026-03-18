import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  active: "Aktywny", potential: "Potencjalny", negotiations: "Negocjacje", project: "Projekt", inactive: "Nieaktywny",
};
const statusColors: Record<string, string> = {
  active: "bg-success/15 text-foreground", potential: "bg-info/15 text-info-foreground",
  negotiations: "bg-warning/15 text-warning-foreground", project: "bg-primary/15 text-primary",
  inactive: "bg-muted text-muted-foreground",
};

export default function Clients() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", contact_person: "", email: "", phone: "", status: "potential" as string, monthly_value: "" });

  const { data: clients, isLoading, refetch } = useQuery({
    queryKey: ["clients", statusFilter],
    queryFn: async () => {
      let q = supabase.from("clients").select("*").order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = clients?.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase())
  ) || [];

  async function handleCreate() {
    if (!form.name.trim()) { toast.error("Podaj nazwę firmy"); return; }
    const { error } = await supabase.from("clients").insert({
      name: form.name, contact_person: form.contact_person, email: form.email,
      phone: form.phone, status: form.status as any,
      monthly_value: form.monthly_value ? parseFloat(form.monthly_value) : 0,
    });
    if (error) { toast.error("Błąd", { description: error.message }); return; }
    toast.success("Klient dodany");
    setForm({ name: "", contact_person: "", email: "", phone: "", status: "potential", monthly_value: "" });
    setIsCreateOpen(false);
    refetch();
  }

  return (
    <AppLayout title="Klienci">
      <div className="space-y-4 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Szukaj klienta..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Dodaj klienta</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nowy klient</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Firma *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Osoba kontaktowa</Label><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Telefon</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Wartość mies.</Label><Input type="number" value={form.monthly_value} onChange={(e) => setForm({ ...form, monthly_value: e.target.value })} /></div>
                </div>
                <Button onClick={handleCreate} className="w-full">Dodaj klienta</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Firma</TableHead>
                <TableHead>Kontakt</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Wynik</TableHead>
                <TableHead>Wartość mies.</TableHead>
                <TableHead>Tagi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Ładowanie...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Brak klientów</TableCell></TableRow>
              ) : (
                filtered.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{c.contact_person || "—"}</p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-xs ${statusColors[c.status] || ""}`}>
                        {statusLabels[c.status] || c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{c.score || 0}</TableCell>
                    <TableCell className="text-sm">{c.monthly_value ? `${Number(c.monthly_value).toLocaleString("pl-PL")} zł` : "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {c.tags?.map((t: string) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                      </div>
                    </TableCell>
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
