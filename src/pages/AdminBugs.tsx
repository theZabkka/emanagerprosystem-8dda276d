import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { Navigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Bug, ChevronRight, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  new: { label: "Nowe", variant: "destructive" },
  in_progress: { label: "W trakcie", variant: "default" },
  resolved: { label: "Rozwiązane", variant: "secondary" },
  closed: { label: "Zamknięte", variant: "outline" },
};

interface BugReport {
  id: string;
  title: string;
  description: string;
  location: string | null;
  steps_to_reproduce: string | null;
  status: string;
  created_at: string;
  reporter_id: string;
  profiles: { full_name: string | null; email: string | null } | null;
}

interface BugAttachment {
  id: string;
  file_path: string;
  file_type: string | null;
}

export default function AdminBugs() {
  const { currentRole } = useRole();
  const queryClient = useQueryClient();
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null);

  const markAsRead = async (bug: BugReport) => {
    if (!(bug as any).is_read) {
      await supabase.from("bug_reports").update({ is_read: true } as any).eq("id", bug.id);
      queryClient.invalidateQueries({ queryKey: ["bug-reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-unread-bugs"] });
    }
  };

  const handleSelectBug = (bug: BugReport) => {
    setSelectedBug(bug);
    markAsRead(bug);
  };

  // Role guard
  const allowed = ["superadmin", "boss", "koordynator"];
  if (!allowed.includes(currentRole)) return <Navigate to="/dashboard" replace />;

  const { data: bugs = [], isLoading } = useQuery({
    queryKey: ["bug-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bug_reports")
        .select("*, profiles:reporter_id(full_name, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BugReport[];
    },
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ["bug-attachments", selectedBug?.id],
    enabled: !!selectedBug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bug_attachments")
        .select("id, file_path, file_type")
        .eq("bug_id", selectedBug!.id);
      if (error) throw error;
      return data as BugAttachment[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("bug_reports").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bug-reports"] });
      toast({ title: "Status zaktualizowany" });
    },
    onError: (err: any) => {
      toast({ title: "Błąd", description: err.message, variant: "destructive" });
    },
  });

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("bug_attachments").getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <AppLayout title="Zgłoszenia błędów">
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Bug className="h-5 w-5 text-destructive" />
          <h2 className="text-xl font-semibold">Panel zgłoszeń błędów</h2>
          <Badge variant="outline" className="ml-auto">{bugs.length} zgłoszeń</Badge>
        </div>

        {isLoading ? (
          <TableSkeleton />
        ) : bugs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bug className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Brak zgłoszonych błędów</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Data</TableHead>
                  <TableHead>Zgłaszający</TableHead>
                  <TableHead>Tytuł</TableHead>
                  <TableHead className="w-[140px]">Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {bugs.map((bug) => {
                  const st = STATUS_MAP[bug.status] || STATUS_MAP.new;
                  return (
                    <TableRow key={bug.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleSelectBug(bug)}>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(bug.created_at), "dd MMM yyyy HH:mm", { locale: pl })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {bug.profiles?.full_name || bug.profiles?.email || "—"}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{bug.title}</TableCell>
                      <TableCell>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Detail Sheet */}
        <Sheet open={!!selectedBug} onOpenChange={(o) => !o && setSelectedBug(null)}>
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            {selectedBug && (
              <>
                <SheetHeader>
                  <SheetTitle className="text-left">{selectedBug.title}</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-5">
                  {/* Status changer */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Status</p>
                    <Select
                      value={selectedBug.status}
                      onValueChange={(val) => {
                        updateStatus.mutate({ id: selectedBug.id, status: val });
                        setSelectedBug({ ...selectedBug, status: val });
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Nowe</SelectItem>
                        <SelectItem value="in_progress">W trakcie</SelectItem>
                        <SelectItem value="resolved">Rozwiązane</SelectItem>
                        <SelectItem value="closed">Zamknięte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Zgłaszający</p>
                    <p className="text-sm">{selectedBug.profiles?.full_name || selectedBug.profiles?.email || "—"}</p>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Data</p>
                    <p className="text-sm">{format(new Date(selectedBug.created_at), "dd MMMM yyyy, HH:mm", { locale: pl })}</p>
                  </div>

                  {selectedBug.location && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">Miejsce</p>
                      <code className="text-sm bg-muted px-2 py-1 rounded">{selectedBug.location}</code>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Opis</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedBug.description}</p>
                  </div>

                  {selectedBug.steps_to_reproduce && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">Kroki do odtworzenia</p>
                      <p className="text-sm whitespace-pre-wrap">{selectedBug.steps_to_reproduce}</p>
                    </div>
                  )}

                  {/* Attachments */}
                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <ImageIcon className="h-3.5 w-3.5" /> Załączniki ({attachments.length})
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {attachments.map((att) => (
                          <a
                            key={att.id}
                            href={getPublicUrl(att.file_path)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block border rounded-lg overflow-hidden hover:ring-2 ring-primary transition-all"
                          >
                            <img
                              src={getPublicUrl(att.file_path)}
                              alt="Screenshot"
                              className="w-full h-32 object-cover bg-muted"
                              loading="lazy"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}
