import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useDataSource } from "@/hooks/useDataSource";
import { mockClients } from "@/lib/mockData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { DemoBanner } from "@/components/dashboard/DemoBanner";
import { CreateClientDialog } from "@/components/clients/CreateClientDialog";
import { ClientsTable } from "@/components/clients/ClientsTable";

const statusLabels: Record<string, string> = {
  active: "Aktywny", potential: "Potencjalny", negotiations: "Negocjacje", project: "Projekt", inactive: "Nieaktywny",
};

export default function Clients() {
  const { isDemo } = useDataSource();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: clients, isLoading, refetch } = useQuery({
    queryKey: ["clients", statusFilter, isDemo],
    queryFn: async () => {
      if (isDemo) {
        let data = [...mockClients];
        if (statusFilter !== "all") data = data.filter(c => c.status === statusFilter);
        return data;
      }
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

  return (
    <AppLayout title="Klienci">
      <div className="space-y-4 max-w-7xl mx-auto">
        {isDemo && <DemoBanner />}

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
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Dodaj klienta
          </Button>
        </div>

        <ClientsTable clients={filtered} isLoading={isLoading} />
        <CreateClientDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} onCreated={() => refetch()} />
      </div>
    </AppLayout>
  );
}
