import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useDataSource } from "@/hooks/useDataSource";
import { mockPipelineDeals, mockClients, mockProfiles } from "@/lib/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, DollarSign } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const stageLabels: Record<string, string> = {
  potential: "Potencjalny", contact: "Kontakt", offer_sent: "Oferta wysłana",
  negotiations: "Negocjacje", won: "Wygrane", lost: "Przegrane",
};
const stageColors: Record<string, string> = {
  potential: "border-muted-foreground/30 bg-muted", contact: "border-info/30 bg-info/10",
  offer_sent: "border-warning/30 bg-warning/10", negotiations: "border-primary/30 bg-primary/10",
  won: "border-success/30 bg-success/10", lost: "border-destructive/30 bg-destructive/10",
};

function getDemoDeals() {
  return mockPipelineDeals.map(d => ({
    ...d,
    clients: mockClients.find(c => c.id === d.client_id) ? { name: mockClients.find(c => c.id === d.client_id)!.name } : null,
    profiles: mockProfiles.find(u => u.id === d.assigned_to) ? { full_name: mockProfiles.find(u => u.id === d.assigned_to)!.full_name } : null,
  }));
}

export default function Pipeline() {
  const { isDemo } = useDataSource();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: "", value: "", stage: "potential", client_id: "" });

  const { data: deals, refetch } = useQuery({
    queryKey: ["pipeline-deals", isDemo],
    queryFn: async () => {
      if (isDemo) return getDemoDeals();
      const { data } = await supabase
        .from("pipeline_deals")
        .select("*, clients(name), profiles:assigned_to(full_name)")
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

  // Real-time (only for DB mode)
  useEffect(() => {
    if (isDemo) return;
    const ch = supabase.channel("pipeline-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "pipeline_deals" }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refetch, isDemo]);

  async function handleCreate() {
    if (!form.title.trim()) { toast.error("Podaj tytuł"); return; }
    if (isDemo) { toast.info("W trybie demo nie można dodawać szans"); return; }
    const { error } = await supabase.from("pipeline_deals").insert({
      title: form.title, value: form.value ? parseFloat(form.value) : 0,
      stage: form.stage as any, client_id: form.client_id || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Szansa dodana");
    setForm({ title: "", value: "", stage: "potential", client_id: "" });
    setIsCreateOpen(false);
    refetch();
  }

  const stages = ["potential", "contact", "offer_sent", "negotiations", "won", "lost"];

  return (
    <AppLayout title="Lejek sprzedaży">
      <div className="space-y-4 max-w-[100rem] mx-auto">
        {isDemo && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary">
            🎭 Tryb demo — wyświetlane są przykładowe dane.
            <a href="/settings" className="underline font-medium ml-1">Zmień w Ustawieniach</a>
          </div>
        )}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Lejek sprzedaży</h2>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Nowa szansa</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nowa szansa sprzedaży</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Tytuł *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Wartość (zł)</Label><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
                  <div className="space-y-2">
                    <Label>Etap</Label>
                    <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{stages.map((s) => <SelectItem key={s} value={s}>{stageLabels[s]}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Klient</Label>
                  <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Wybierz klienta" /></SelectTrigger>
                    <SelectContent>{clients?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} className="w-full">Dodaj szansę</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Kanban pipeline */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {stages.map((stage) => {
            const stageDeals = deals?.filter((d: any) => d.stage === stage) || [];
            const totalValue = stageDeals.reduce((s: number, d: any) => s + Number(d.value || 0), 0);
            return (
              <div key={stage} className="space-y-3">
                <div className={`rounded-lg p-3 border ${stageColors[stage]}`}>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold">{stageLabels[stage]}</h3>
                    <Badge variant="outline" className="text-xs">{stageDeals.length}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />{totalValue.toLocaleString("pl-PL")} zł
                  </p>
                </div>
                <div className="space-y-2">
                  {stageDeals.map((deal: any) => (
                    <Card key={deal.id} className="shadow-sm">
                      <CardContent className="p-3 space-y-1">
                        <p className="text-sm font-medium">{deal.title}</p>
                        <p className="text-xs text-muted-foreground">{deal.clients?.name || "—"}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">{Number(deal.value || 0).toLocaleString("pl-PL")} zł</span>
                          <span className="text-[10px] text-muted-foreground">{deal.days_in_stage || 0}d</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
