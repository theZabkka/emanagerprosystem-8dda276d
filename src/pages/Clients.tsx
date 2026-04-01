import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Filter } from "lucide-react";
import { CreateClientDialog } from "@/components/clients/CreateClientDialog";
import { ClientsTable } from "@/components/clients/ClientsTable";
import { CLIENT_STATUS_GROUPS, CLIENT_STATUSES, getClientStatusColor } from "@/constants/clientStatuses";

export default function Clients() {
  const [search, setSearch] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: clients, isLoading, refetch } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = (clients || []).filter((c: any) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilters.length === 0 || statusFilters.includes(c.status || "");
    return matchSearch && matchStatus;
  });

  const toggleStatusFilter = (status: string) => {
    setStatusFilters((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  return (
    <AppLayout title="Klienci">
      <div className="space-y-4 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-1 flex-wrap items-center">
            <div className="relative flex-1 max-w-sm min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Szukaj klienta..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Filter className="h-4 w-4" />
                  Status
                  {statusFilters.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
                      {statusFilters.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="start">
                <div className="space-y-3">
                  {CLIENT_STATUS_GROUPS.map((group) => (
                    <div key={group.name}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{group.name}</p>
                      {group.statuses.map((s) => (
                        <label key={s.value} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1">
                          <Checkbox
                            checked={statusFilters.includes(s.value)}
                            onCheckedChange={() => toggleStatusFilter(s.value)}
                          />
                          <span className={`inline-block w-2 h-2 rounded-full ${s.colorClass.split(" ")[0]}`} />
                          <span className="text-sm">{s.label}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                  {statusFilters.length > 0 && (
                    <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setStatusFilters([])}>
                      Wyczyść filtry
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {statusFilters.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {statusFilters.map((sf) => (
                  <Badge key={sf} variant="outline" className={`text-xs cursor-pointer ${getClientStatusColor(sf)}`} onClick={() => toggleStatusFilter(sf)}>
                    {sf} ×
                  </Badge>
                ))}
              </div>
            )}
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
