import { useState, useMemo, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import TaskKanbanBoard from "@/components/tasks/TaskKanbanBoard";
import {
  ArrowLeft, Phone, MessageSquare, DollarSign, ListTodo, AlertTriangle, PhoneCall,
  Copy, Check, CheckCircle2, Circle, Search, Plus, LayoutGrid, List, Timer,
  FileText, Link as LinkIcon, ThumbsUp, Mail, Users, Upload, Trash2, Download,
  Pencil, Calendar, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import ClientCallsTab from "@/components/calls/ClientCallsTab";
import { EditClientDialog } from "@/components/clients/EditClientDialog";
import CreateTaskDialog from "@/components/tasks/CreateTaskDialog";
import { ClientNotesTimeline } from "@/components/clients/ClientNotesTimeline";
import { CLIENT_STATUS_GROUPS, getClientStatusColor, getClientStatusLabel } from "@/constants/clientStatuses";
import { ClientNotesCard } from "@/components/clients/ClientNotesCard";

const offerStatusLabels: Record<string, { label: string; className: string }> = {
  draft: { label: "Szkic", className: "bg-muted text-muted-foreground" },
  sent: { label: "Wysłana", className: "bg-blue-500/15 text-blue-700 border-blue-500/30" },
  accepted: { label: "Zaakceptowana", className: "bg-green-600/15 text-green-700 border-green-600/30" },
  rejected: { label: "Odrzucona", className: "bg-red-500/15 text-red-700 border-red-500/30" },
};

const ideaStatusLabels: Record<string, { label: string; className: string }> = {
  new: { label: "Nowy", className: "bg-blue-500/15 text-blue-700 border-blue-500/30" },
  in_analysis: { label: "W analizie", className: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30" },
  implemented: { label: "Wdrożony", className: "bg-green-600/15 text-green-700 border-green-600/30" },
};

const convTypeIcons: Record<string, { icon: typeof Phone; label: string }> = {
  phone: { icon: Phone, label: "Telefon" },
  meeting: { icon: Users, label: "Spotkanie" },
  email: { icon: Mail, label: "E-mail" },
};

const CLIENT_TABS = [
  { key: "tasks", label: "Zadania" },
  { key: "notes", label: "Notatki" },
  { key: "conversations", label: "Rozmowy" },
  { key: "voip", label: "Rozmowy VoIP" },
  { key: "offers", label: "Oferty" },
  { key: "ideas", label: "Pomysły" },
  { key: "contracts", label: "Umowy" },
  { key: "orders", label: "Zlecenia" },
  { key: "files", label: "Pliki (Drive)" },
  { key: "social", label: "Social Media" },
  { key: "billing", label: "Dane do faktury" },
  { key: "history", label: "Historia" },
];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function getInitials(name: string | null | undefined) {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

// Mutable demo state
export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("tasks");
  const [copied, setCopied] = useState(false);
  const [taskSearch, setTaskSearch] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  // Dialog states
  const [showIdeaDialog, setShowIdeaDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showInvoiceEdit, setShowInvoiceEdit] = useState(false);
  const [showEditClient, setShowEditClient] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newIdeaTitle, setNewIdeaTitle] = useState("");
  const [newIdeaDesc, setNewIdeaDesc] = useState("");
  const [newLinkName, setNewLinkName] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  const handleDeleteClient = async () => {
    if (!id) return;
    setIsDeleting(true);
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) {
      toast.error("Błąd usuwania klienta: " + error.message);
      setIsDeleting(false);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    toast.success(`Pomyślnie usunięto klienta "${client?.name}"`);
    navigate("/clients");
  };

  // ─── Fetch client ──────────────────────────────────────────────
  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // ─── Fetch projects ────────────────────────────────────────────
  const { data: projects } = useQuery({
    queryKey: ["client-projects", id],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*").eq("client_id", id!).eq("is_archived", false);
      return data || [];
    },
    enabled: !!id,
  });

  // ─── Fetch tasks ──────────────────────────────────────────────
  const { data: tasks } = useQuery({
    queryKey: ["client-tasks", id],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*").eq("client_id", id!);
      return data || [];
    },
    enabled: !!id,
  });

  // ─── Fetch profiles & assignments ─────────────────────────────
  const { data: profiles } = useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data || [];
    },
  });

  const { data: assignments } = useQuery({
    queryKey: ["client-assignments", id],
    queryFn: async () => {
      const { data: clientTasks } = await supabase.from("tasks").select("id").eq("client_id", id!);
      if (!clientTasks?.length) return [];
      const taskIds = clientTasks.map(t => t.id);
      const { data } = await supabase.from("task_assignments").select("*").in("task_id", taskIds);
      return data || [];
    },
    enabled: !!id,
  });

  // ─── Fetch deals ──────────────────────────────────────────────
  const { data: deals } = useQuery({
    queryKey: ["client-deals", id],
    queryFn: async () => {
      const { data } = await supabase.from("pipeline_deals").select("*").eq("client_id", id!);
      return data || [];
    },
    enabled: !!id,
  });

  // ─── Fetch offers ─────────────────────────────────────────────
  const { data: offers } = useQuery({
    queryKey: ["client-offers", id],
    queryFn: async () => {
      const { data } = await supabase.from("client_offers").select("*").eq("client_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  // ─── Fetch ideas ──────────────────────────────────────────────
  const { data: ideas } = useQuery({
    queryKey: ["client-ideas", id],
    queryFn: async () => {
      const { data } = await supabase.from("client_ideas").select("*").eq("client_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  // ─── Fetch conversations ──────────────────────────────────────
  const { data: conversations } = useQuery({
    queryKey: ["client-conversations", id],
    queryFn: async () => {
      const { data } = await supabase.from("client_conversations").select("*").eq("client_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  // ─── Fetch files ──────────────────────────────────────────────
  const { data: files } = useQuery({
    queryKey: ["client-files", id],
    queryFn: async () => {
      const { data } = await supabase.from("client_files").select("*").eq("client_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  // ─── Fetch invoice data ───────────────────────────────────────
  const { data: invoiceData } = useQuery({
    queryKey: ["client-invoice", id],
    queryFn: async () => {
      const { data } = await supabase.from("client_invoice_data").select("*").eq("client_id", id!).maybeSingle();
      return data || null;
    },
    enabled: !!id,
  });

  // ─── Fetch contracts ──────────────────────────────────────────
  const { data: contracts } = useQuery({
    queryKey: ["client-contracts", id],
    queryFn: async () => {
      const { data } = await supabase.from("client_contracts").select("*").eq("client_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  // ─── Fetch orders ─────────────────────────────────────────────
  const { data: orders } = useQuery({
    queryKey: ["client-orders", id],
    queryFn: async () => {
      const { data } = await supabase.from("client_orders").select("*").eq("client_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  // ─── Fetch social accounts ────────────────────────────────────
  const { data: socialAccounts } = useQuery({
    queryKey: ["client-social", id],
    queryFn: async () => {
      const { data } = await supabase.from("client_social_accounts").select("*").eq("client_id", id!);
      return data || [];
    },
    enabled: !!id,
  });

  // ─── Fetch activity history ───────────────────────────────────
  const { data: activityHistory } = useQuery({
    queryKey: ["client-history", id],
    queryFn: async () => {
      const { data } = await supabase.from("activity_log").select("*").or(`entity_id.eq.${id}`).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!id,
  });

  // ─── Fetch calls count ────────────────────────────────────────
  const { data: callsCount } = useQuery({
    queryKey: ["client-calls-count", id],
    queryFn: async () => {
      const { count } = await supabase.from("calls").select("id", { count: "exact", head: true }).eq("client_id", id!);
      return count || 0;
    },
    enabled: !!id,
  });

  const [invoiceForm, setInvoiceForm] = useState({ company_name: "", nip: "", street: "", postal_code: "", city: "" });

  const openInvoiceEdit = () => {
    if (invoiceData) {
      setInvoiceForm({
        company_name: (invoiceData as any).company_name || "",
        nip: (invoiceData as any).nip || "",
        street: (invoiceData as any).street || "",
        postal_code: (invoiceData as any).postal_code || "",
        city: (invoiceData as any).city || "",
      });
    } else {
      setInvoiceForm({ company_name: client?.name || "", nip: "", street: "", postal_code: "", city: "" });
    }
    setShowInvoiceEdit(true);
  };

  const saveInvoiceData = async () => {
const { data: existing } = await supabase.from("client_invoice_data").select("id").eq("client_id", id!).maybeSingle();
      if (existing) {
        await supabase.from("client_invoice_data").update({ ...invoiceForm, updated_at: new Date().toISOString() }).eq("client_id", id!);
      } else {
        await supabase.from("client_invoice_data").insert({ client_id: id!, ...invoiceForm });
      }
      queryClient.invalidateQueries({ queryKey: ["client-invoice"] });

    setShowInvoiceEdit(false);
    toast.success("Dane do faktury zapisane");
  };

  // ─── Computed values ──────────────────────────────────────────
  const activeTasks = useMemo(() => (tasks || []).filter((t: any) =>
    ["todo", "in_progress", "review", "corrections", "client_review"].includes(t.status)
  ), [tasks]);

  const openBugs = useMemo(() => (tasks || []).filter((t: any) => t.bug_severity && t.status !== "done" && t.status !== "cancelled"), [tasks]);

  const onboardingSteps = useMemo(() => {
    if (!client) return [];
    const steps = (client as any).onboarding_steps;
    if (Array.isArray(steps)) return steps;
    try { return JSON.parse(steps || "[]"); } catch { return []; }
  }, [client]);

  const onboardingCompleted = onboardingSteps.filter((s: any) => s.completed).length;
  const onboardingTotal = onboardingSteps.length;
  const onboardingPercent = onboardingTotal > 0 ? (onboardingCompleted / onboardingTotal) * 100 : 0;

  const publicUrl = useMemo(() => {
    const token = (client as any)?.public_status_token;
    if (!token) return null;
    return `${window.location.origin}/status/${token}`;
  }, [client]);

  // ─── Tab counts ───────────────────────────────────────────────
  const tabCounts: Record<string, number> = useMemo(() => ({
    tasks: activeTasks.length,
    conversations: (conversations || []).length,
    voip: 0,
    offers: (offers || []).length,
    ideas: (ideas || []).length,
    contracts: (contracts || []).length,
    orders: (orders || []).length,
    files: (files || []).length,
    social: (socialAccounts || []).length,
    billing: invoiceData ? 1 : 0,
    history: (activityHistory || []).length,
  }), [activeTasks, conversations, offers, ideas, contracts, orders, files, socialAccounts, invoiceData, activityHistory]);

  // ─── Filtered tasks ───────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    let ft = tasks || [];
    if (taskSearch) ft = ft.filter((t: any) => t.title.toLowerCase().includes(taskSearch.toLowerCase()));
    if (taskStatusFilter !== "all") ft = ft.filter((t: any) => t.status === taskStatusFilter);
    if (taskPriorityFilter !== "all") ft = ft.filter((t: any) => t.priority === taskPriorityFilter);
    return ft;
  }, [tasks, taskSearch, taskStatusFilter, taskPriorityFilter]);

  const tasksByProject = useMemo(() => {
    const groups: Record<string, { project: any; tasks: any[] }> = {};
    (filteredTasks || []).forEach((t: any) => {
      const pId = t.project_id || "__none__";
      if (!groups[pId]) {
        const proj = (projects || []).find((p: any) => p.id === pId);
        groups[pId] = { project: proj || { id: "__none__", name: "Bez projektu" }, tasks: [] };
      }
      groups[pId].tasks.push(t);
    });
    return Object.values(groups);
  }, [filteredTasks, projects]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    await supabase.from("tasks").update({ status: newStatus as any }).eq("id", taskId);
  };

  const handleCopy = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Link skopiowany!");
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  // ─── Actions ──────────────────────────────────────────────────
  const handleAddIdea = async () => {
    if (!newIdeaTitle.trim()) return;
await supabase.from("client_ideas").insert({ client_id: id!, title: newIdeaTitle, description: newIdeaDesc, created_by: user?.id });
      queryClient.invalidateQueries({ queryKey: ["client-ideas"] });

    setNewIdeaTitle(""); setNewIdeaDesc(""); setShowIdeaDialog(false);
    toast.success("Pomysł dodany");
  };

  const handleVoteIdea = async (ideaId: string) => {
const idea = (ideas || []).find((i: any) => i.id === ideaId);
      if (idea) {
        await supabase.from("client_ideas").update({ votes: ((idea as any).votes || 0) + 1 }).eq("id", ideaId);
        queryClient.invalidateQueries({ queryKey: ["client-ideas"] });
      }

  };

  const handleAddLink = async () => {
    if (!newLinkName.trim() || !newLinkUrl.trim()) return;
await supabase.from("client_files").insert({ client_id: id!, name: newLinkName, url: newLinkUrl, size: 0, uploaded_by: user?.id });
      queryClient.invalidateQueries({ queryKey: ["client-files"] });

    setNewLinkName(""); setNewLinkUrl(""); setShowLinkDialog(false);
    toast.success("Link dodany");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const path = `${id}/${Date.now()}-${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("task_materials").upload(path, file);
    if (uploadErr) { toast.error("Błąd uploadu"); return; }
    const { data: urlData } = supabase.storage.from("task_materials").getPublicUrl(path);
    await supabase.from("client_files").insert({ client_id: id!, name: file.name, size: file.size, url: urlData.publicUrl, uploaded_by: user?.id });
    queryClient.invalidateQueries({ queryKey: ["client-files"] });
    toast.success("Plik wgrany");
  };

  const handleDeleteFile = async (fileId: string) => {
await supabase.from("client_files").delete().eq("id", fileId);
      queryClient.invalidateQueries({ queryKey: ["client-files"] });

    toast.success("Plik usunięty");
  };

  const getProfileName = (userId: string | null | undefined) => {
    if (!userId) return "Nieznany";
    const p = (profiles || []).find((pr: any) => pr.id === userId);
    return (p as any)?.full_name || "Nieznany";
  };

  // Timer effect
  useState(() => {
    if (!timerRunning) return;
    const iv = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    return () => clearInterval(iv);
  });

  if (loadingClient) {
    return <AppLayout title="Klient"><div className="flex items-center justify-center h-64 text-muted-foreground">Ładowanie...</div></AppLayout>;
  }

  if (!client) {
    return <AppLayout title="Klient"><div className="text-center py-16 text-muted-foreground">Nie znaleziono klienta</div></AppLayout>;
  }

  return (
    <AppLayout title={client.name}>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* ─── Header ─────────────────────────────────────────── */}
        <div>
          <Link to="/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
            <ArrowLeft className="h-4 w-4" /> Wróć do klientów
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-extrabold text-foreground">{client.name}</h1>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setShowEditClient(true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {client.contact_person || "—"} · {client.email || "—"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="bg-green-600/10 border-green-600/30 text-green-700 hover:bg-green-600/20">
                <Phone className="h-4 w-4 mr-1" /> Zadzwoń
              </Button>
              <Button size="sm" variant="outline" className="bg-red-500/10 border-red-500/30 text-red-600 hover:bg-red-500/20">
                <MessageSquare className="h-4 w-4 mr-1" /> SMS
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4 mr-1" /> Usuń
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Trwałe usunięcie klienta</AlertDialogTitle>
                    <AlertDialogDescription>
                      Czy na pewno chcesz trwale usunąć klienta <strong>"{client.name}"</strong>? Zostaną usunięte wszystkie powiązane dane (projekty, notatki, oferty, umowy). Tej operacji nie można cofnąć.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteClient} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {isDeleting ? "Usuwanie..." : "Tak, usuń"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {(() => {
                const displayStatus = client.status || "Nowy kontakt";
                return (
                  <Select
                    key={`${client.status ?? ""}-${(client as any).updated_at ?? ""}`}
                    value={displayStatus}
                    onValueChange={async (newStatus) => {
                      if (updatingStatus) return;

                      const clientId = client.id;
                      const clientQueryKey = ["client", clientId] as const;
                      const previousClient = queryClient.getQueryData<any>(clientQueryKey);
                      const previousClients = queryClient.getQueryData<any[]>(["clients"]);

                      setUpdatingStatus(true);

                      try {
                        // KROK 1: Stopujemy aktywne pobrania
                        await queryClient.cancelQueries({ queryKey: ["clients"] });
                        await queryClient.cancelQueries({ queryKey: clientQueryKey });

                        // KROK 2: Optymistyczna aktualizacja tylko przez cache React Query
                        queryClient.setQueryData(clientQueryKey, (old: any) =>
                          old ? { ...old, status: newStatus } : old
                        );
                        queryClient.setQueryData(["clients"], (old: any[] | undefined) =>
                          old?.map((c: any) => (c.id === clientId ? { ...c, status: newStatus } : c))
                        );

                        // KROK 4: Twarda weryfikacja zapisu
                        const { data, error } = await supabase
                          .from("clients")
                          .update({ status: newStatus as any })
                          .eq("id", clientId)
                          .select();

                        const updatedClient = data?.[0];
                        if (error || !updatedClient || updatedClient.status !== newStatus) {
                          // Rollback cache
                          if (previousClient !== undefined) queryClient.setQueryData(clientQueryKey, previousClient);
                          if (previousClients !== undefined) queryClient.setQueryData(["clients"], previousClients);

                          console.error("Szczegóły błędu zapisu:", error);
                          toast.error(error?.message || "Błąd zapisu statusu klienta. Zmiana została cofnięta.");
                          return;
                        }

                        // KROK 3: Twarde czyszczenie cache klientów
                        await queryClient.removeQueries({ queryKey: ["clients"] });
                        await queryClient.removeQueries({ queryKey: ["client"] });
                        toast.success(`Status zmieniony na: ${newStatus}`);
                      } catch (err: any) {
                        if (previousClient !== undefined) queryClient.setQueryData(clientQueryKey, previousClient);
                        if (previousClients !== undefined) queryClient.setQueryData(["clients"], previousClients);
                        console.error("Błąd połączenia przy zmianie statusu:", err);
                        toast.error(err?.message || "Błąd połączenia. Zmiana statusu nieudana.");
                      } finally {
                        setUpdatingStatus(false);
                      }
                    }}
                  >
                    <SelectTrigger onPointerDown={(e) => e.stopPropagation()} className="w-auto h-auto border-0 p-0 shadow-none focus:ring-0">
                      <Badge variant="outline" className={`text-xs font-bold px-3 py-1 cursor-pointer transition-opacity ${updatingStatus ? "opacity-50" : ""} ${getClientStatusColor(displayStatus)}`}>
                        {getClientStatusLabel(displayStatus)}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {CLIENT_STATUS_GROUPS.map((group) => (
                        <div key={group.name}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{group.name}</div>
                          {group.statuses.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              <span className="flex items-center gap-2">
                                <span className={`inline-block w-2 h-2 rounded-full ${s.colorClass.split(" ")[0]}`} />
                                {s.label}
                              </span>
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                );
              })()}
            </div>
          </div>

          <EditClientDialog
            open={showEditClient}
            onOpenChange={setShowEditClient}
            client={client}
            onUpdated={() => { queryClient.invalidateQueries({ queryKey: ["client", id] }); queryClient.invalidateQueries({ queryKey: ["clients"] }); }}
          />
          <CreateTaskDialog
            open={showCreateTask}
            onOpenChange={setShowCreateTask}
            onCreated={() => queryClient.invalidateQueries({ queryKey: ["client-tasks", id] })}
          />
        </div>

        {/* ─── KPI Cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Wartość miesięczna</p>
                  <p className="text-2xl font-extrabold text-foreground mt-1">
                    {(client.monthly_value || 0).toLocaleString("pl-PL")} zł
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-green-600/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Aktywne zadania</p>
                  <p className="text-2xl font-extrabold text-foreground mt-1">{activeTasks.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ListTodo className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Otwarte zgłoszenia</p>
                  <p className="text-2xl font-extrabold text-foreground mt-1">{openBugs.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Rozmowy</p>
                  <p className="text-2xl font-extrabold text-foreground mt-1">{(conversations || []).length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <PhoneCall className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Onboarding + Public Status ─────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Notes Card */}
          <ClientNotesCard clientId={id!} onShowAll={() => setActiveTab("notes")} />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold tracking-wider text-foreground">ONBOARDING</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-muted-foreground">{onboardingCompleted}/{onboardingTotal} kroków</span>
                  <span className="font-bold text-primary">{Math.round(onboardingPercent)}%</span>
                </div>
                <Progress value={onboardingPercent} className="h-2 [&>div]:bg-primary" />
              </div>
              {onboardingTotal === 0 ? (
                <p className="text-xs text-muted-foreground">Brak kroków onboardingu</p>
              ) : (
                <ul className="space-y-2">
                  {onboardingSteps.map((step: any, i: number) => (
                    <li key={i} className="flex items-center gap-2">
                      {step.completed ? <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />}
                      <span className={`text-sm ${step.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{step.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold tracking-wider text-foreground">PUBLICZNA STRONA STATUSU</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Udostępnij klientowi link do publicznej strony z postępem prac.</p>
              {publicUrl ? (
                <div className="flex gap-2">
                  <Input value={publicUrl} readOnly className="text-xs bg-muted font-mono" />
                  <Button size="sm" onClick={handleCopy} className="flex-shrink-0">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span className="ml-1">{copied ? "Skopiowano" : "Kopiuj"}</span>
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Brak tokenu — link nie został jeszcze wygenerowany.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── Tabs Navigation ────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <ScrollArea className="w-full">
            <TabsList className="bg-transparent h-auto p-0 gap-1 flex w-max">
              {CLIENT_TABS.map(tab => {
                const count = tabCounts[tab.key] || 0;
                const isActive = activeTab === tab.key;
                return (
                  <TabsTrigger key={tab.key} value={tab.key} className={`text-xs font-semibold px-3 py-2 rounded-md transition-colors data-[state=active]:shadow-none ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                    {tab.label}
                    <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background text-muted-foreground"}`}>{count}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* ─── Tasks Tab ────────────────────────────────────── */}
          <TabsContent value="tasks" className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex gap-2 flex-1">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Szukaj zadania..." value={taskSearch} onChange={e => setTaskSearch(e.target.value)} className="pl-9 h-9 text-sm" />
                </div>
                <Select value={taskStatusFilter} onValueChange={setTaskStatusFilter}>
                  <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie</SelectItem>
                    <SelectItem value="todo">Do zrobienia</SelectItem>
                    <SelectItem value="in_progress">W realizacji</SelectItem>
                    <SelectItem value="review">Weryfikacja</SelectItem>
                    <SelectItem value="corrections">Poprawki</SelectItem>
                    <SelectItem value="client_review">Do akceptacji</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={taskPriorityFilter} onValueChange={setTaskPriorityFilter}>
                  <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Priorytet" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie</SelectItem>
                    <SelectItem value="critical">Pilny</SelectItem>
                    <SelectItem value="high">Wysoki</SelectItem>
                    <SelectItem value="medium">Średni</SelectItem>
                    <SelectItem value="low">Niski</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => setShowCreateTask(true)}><Plus className="h-4 w-4 mr-1" /> Nowe zadanie</Button>
                <div className="flex bg-muted rounded-md p-0.5">
                  <button onClick={() => setViewMode("kanban")} className={`p-1.5 rounded ${viewMode === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><LayoutGrid className="h-4 w-4" /></button>
                  <button onClick={() => setViewMode("list")} className={`p-1.5 rounded ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><List className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
            {tasksByProject.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Brak zadań dla tego klienta</div>
            ) : (
              tasksByProject.map(group => (
                <div key={group.project.id} className="space-y-2">
                  <h3 className="text-xs font-extrabold tracking-widest text-foreground uppercase border-b border-border pb-1.5">{group.project.name}</h3>
                  <TaskKanbanBoard tasks={group.tasks} profiles={profiles || []} assignments={assignments || []} clients={[client]} onStatusChange={handleStatusChange} />
                </div>
              ))
            )}
          </TabsContent>

          {/* ─── Notes Tab ─────────────────────────────────────── */}
          <TabsContent value="notes" className="mt-4">
            <ClientNotesTimeline clientId={id!} />
          </TabsContent>

          {/* ─── Offers Tab ───────────────────────────────────── */}
          <TabsContent value="offers" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {(offers || []).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">Brak ofert dla tego klienta</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nazwa oferty</TableHead>
                        <TableHead>Data utworzenia</TableHead>
                        <TableHead>Wartość</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Akcja</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(offers || []).map((offer: any) => {
                        const st = offerStatusLabels[offer.status] || offerStatusLabels.draft;
                        return (
                          <TableRow key={offer.id}>
                            <TableCell className="font-medium">{offer.name}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(offer.created_at), "dd.MM.yyyy", { locale: pl })}
                            </TableCell>
                            <TableCell className="font-semibold">{(offer.value || 0).toLocaleString("pl-PL")} zł</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${st.className}`}>{st.label}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="ghost"><ExternalLink className="h-4 w-4 mr-1" /> Podgląd</Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Ideas Tab ────────────────────────────────────── */}
          <TabsContent value="ideas" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowIdeaDialog(true)}><Plus className="h-4 w-4 mr-1" /> Zgłoś pomysł</Button>
            </div>
            {(ideas || []).length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Brak pomysłów</CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(ideas || []).map((idea: any) => {
                  const st = ideaStatusLabels[idea.status] || ideaStatusLabels.new;
                  return (
                    <Card key={idea.id}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <h4 className="font-semibold text-foreground">{idea.title}</h4>
                            <p className="text-sm text-muted-foreground line-clamp-2">{idea.description}</p>
                          </div>
                          <Badge variant="outline" className={`text-xs ml-2 flex-shrink-0 ${st.className}`}>{st.label}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(idea.created_at), "dd.MM.yyyy", { locale: pl })}
                          </span>
                          <Button size="sm" variant="ghost" className="gap-1" onClick={() => handleVoteIdea(idea.id)}>
                            <ThumbsUp className="h-4 w-4" />
                            <span className="font-bold">{idea.votes || 0}</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ─── Conversations Tab ────────────────────────────── */}
          <TabsContent value="conversations" className="mt-4">
            {(conversations || []).length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Brak rozmów</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {(conversations || []).map((conv: any) => {
                  const cType = convTypeIcons[conv.type] || convTypeIcons.phone;
                  const IconComp = cType.icon;
                  const participantName = getProfileName(conv.participant_id);
                  return (
                    <Card key={conv.id}>
                      <CardContent className="p-4 flex gap-4">
                        <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                          <IconComp className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px]">{cType.label}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(conv.created_at), "dd.MM.yyyy HH:mm", { locale: pl })}
                            </span>
                          </div>
                          <p className="text-sm text-foreground">{conv.summary}</p>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(participantName)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground hidden sm:inline">{participantName}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ─── VoIP Calls Tab ───────────────────────────────── */}
          <TabsContent value="voip" className="mt-4">
            <ClientCallsTab clientId={id!} />
          </TabsContent>

          {/* ─── Files Tab ────────────────────────────────────── */}
          <TabsContent value="files" className="mt-4 space-y-4">
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowLinkDialog(true)}>
                <LinkIcon className="h-4 w-4 mr-1" /> Dodaj link
              </Button>
              <Button size="sm" asChild>
                <label className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-1" /> Wgraj plik
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                {(files || []).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">Brak plików</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nazwa pliku</TableHead>
                        <TableHead>Rozmiar</TableHead>
                        <TableHead>Data wgrania</TableHead>
                        <TableHead>Kto wgrał</TableHead>
                        <TableHead className="text-right">Akcje</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(files || []).map((file: any) => {
                        const uploaderName = getProfileName(file.uploaded_by);
                        return (
                          <TableRow key={file.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="font-medium">{file.name}</span>
                                {file.url && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">{file.size > 0 ? formatFileSize(file.size) : "—"}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(file.created_at), "dd.MM.yyyy", { locale: pl })}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{getInitials(uploaderName)}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-muted-foreground">{uploaderName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteFile(file.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Billing Tab ──────────────────────────────────── */}
          <TabsContent value="billing" className="mt-4">
            <Card className="max-w-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-bold tracking-wider">DANE DO FAKTURY</CardTitle>
                <Button size="sm" variant="outline" onClick={openInvoiceEdit}><Pencil className="h-4 w-4 mr-1" /> Edytuj dane</Button>
              </CardHeader>
              <CardContent>
                {invoiceData ? (
                  <div className="space-y-3 text-sm">
                    <div><span className="text-muted-foreground">Nazwa firmy:</span> <span className="font-semibold text-foreground ml-2">{(invoiceData as any).company_name}</span></div>
                    <div><span className="text-muted-foreground">NIP:</span> <span className="font-semibold text-foreground ml-2">{(invoiceData as any).nip}</span></div>
                    <div><span className="text-muted-foreground">Adres:</span> <span className="font-semibold text-foreground ml-2">{(invoiceData as any).street}, {(invoiceData as any).postal_code} {(invoiceData as any).city}</span></div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Brak danych do faktury. Kliknij „Edytuj dane", aby dodać.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Contracts Tab ────────────────────────────────── */}
          <TabsContent value="contracts" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {(contracts || []).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">Brak umów</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nazwa umowy</TableHead>
                        <TableHead>Typ</TableHead>
                        <TableHead>Wartość</TableHead>
                        <TableHead>Okres</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(contracts || []).map((c: any) => {
                        const typeLabels: Record<string, string> = { service: "Usługowa", nda: "NDA", amendment: "Aneks" };
                        const cStatusColors: Record<string, string> = {
                          active: "bg-green-600/15 text-green-700 border-green-600/30",
                          signed: "bg-blue-500/15 text-blue-700 border-blue-500/30",
                          draft: "bg-muted text-muted-foreground",
                          expired: "bg-red-500/15 text-red-700 border-red-500/30",
                        };
                        const cStatusLabels: Record<string, string> = { active: "Aktywna", signed: "Podpisana", draft: "Szkic", expired: "Wygasła" };
                        return (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">{c.name}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{typeLabels[c.type] || c.type}</Badge></TableCell>
                            <TableCell className="font-semibold">{c.value > 0 ? `${(c.value || 0).toLocaleString("pl-PL")} zł` : "—"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {c.start_date && c.end_date ? `${format(new Date(c.start_date), "dd.MM.yyyy")} – ${format(new Date(c.end_date), "dd.MM.yyyy")}` : "—"}
                            </TableCell>
                            <TableCell><Badge variant="outline" className={`text-xs ${cStatusColors[c.status] || ""}`}>{cStatusLabels[c.status] || c.status}</Badge></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Orders Tab ───────────────────────────────────── */}
          <TabsContent value="orders" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {(orders || []).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">Brak zleceń</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nazwa zlecenia</TableHead>
                        <TableHead>Wartość</TableHead>
                        <TableHead>Termin</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(orders || []).map((o: any) => {
                        const oStatusColors: Record<string, string> = {
                          new: "bg-blue-500/15 text-blue-700 border-blue-500/30",
                          in_progress: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
                          completed: "bg-green-600/15 text-green-700 border-green-600/30",
                          cancelled: "bg-red-500/15 text-red-700 border-red-500/30",
                        };
                        const oStatusLabels: Record<string, string> = { new: "Nowe", in_progress: "W realizacji", completed: "Ukończone", cancelled: "Anulowane" };
                        return (
                          <TableRow key={o.id}>
                            <TableCell className="font-medium">{o.name}</TableCell>
                            <TableCell className="font-semibold">{(o.value || 0).toLocaleString("pl-PL")} zł</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {o.due_date ? format(new Date(o.due_date), "dd.MM.yyyy") : "—"}
                            </TableCell>
                            <TableCell><Badge variant="outline" className={`text-xs ${oStatusColors[o.status] || ""}`}>{oStatusLabels[o.status] || o.status}</Badge></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Social Media Tab ─────────────────────────────── */}
          <TabsContent value="social" className="mt-4">
            {(socialAccounts || []).length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Brak kont social media</CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(socialAccounts || []).map((acc: any) => {
                  const platformIcons: Record<string, string> = { facebook: "📘", instagram: "📸", linkedin: "💼", twitter: "🐦", tiktok: "🎵", youtube: "🎬" };
                  return (
                    <Card key={acc.id}>
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="text-2xl">{platformIcons[acc.platform] || "🌐"}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground capitalize">{acc.platform}</span>
                            <Badge variant="outline" className="text-xs">{acc.handle}</Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span><Users className="h-3 w-3 inline mr-1" />{(acc.followers || 0).toLocaleString("pl-PL")} obserwujących</span>
                            {acc.last_post_at && <span><Calendar className="h-3 w-3 inline mr-1" />Ostatni post: {format(new Date(acc.last_post_at), "dd.MM.yyyy")}</span>}
                          </div>
                        </div>
                        {acc.url && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={acc.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ─── History Tab ──────────────────────────────────── */}
          <TabsContent value="history" className="mt-4">
            {(activityHistory || []).length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Brak historii aktywności</CardContent></Card>
            ) : (
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-0">
                    {(activityHistory || []).map((entry: any, i: number) => {
                      const authorName = (entry as any).profiles?.full_name || getProfileName(entry.user_id) || "Usunięty użytkownik";
                      const isMissing = !(entry as any).profiles?.full_name && !getProfileName(entry.user_id);
                      return (
                        <div key={entry.id || i} className="flex items-start gap-3 py-3 border-b border-border last:border-0">
                          <Avatar className="h-7 w-7 mt-0.5">
                            <AvatarFallback className={`text-[10px] ${isMissing ? "bg-muted/60 text-muted-foreground" : "bg-primary/10 text-primary"}`}>{getInitials(authorName)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground">
                              <span className={`font-semibold ${isMissing ? "text-muted-foreground italic" : ""}`}>{authorName}</span>{" "}
                              <span className="text-muted-foreground">{entry.action}</span>{" "}
                              <span className="font-medium">{entry.entity_name}</span>
                            </p>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(entry.created_at), "dd.MM.yyyy HH:mm", { locale: pl })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── Floating Timer Pill ──────────────────────────────── */}
      <button
        onClick={() => { setTimerRunning(!timerRunning); if (timerRunning) setTimerSeconds(0); }}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-full shadow-lg hover:bg-green-700 transition-colors"
      >
        <Timer className="h-4 w-4" />
        <span className="text-sm font-bold">{formatTimer(timerSeconds)}</span>
        <span className="text-xs opacity-80">{client.name}</span>
      </button>

      {/* ─── Idea Dialog ──────────────────────────────────────── */}
      <Dialog open={showIdeaDialog} onOpenChange={setShowIdeaDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Zgłoś pomysł</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Tytuł</Label><Input value={newIdeaTitle} onChange={e => setNewIdeaTitle(e.target.value)} placeholder="Nazwa pomysłu..." /></div>
            <div><Label>Opis</Label><Textarea value={newIdeaDesc} onChange={e => setNewIdeaDesc(e.target.value)} placeholder="Opisz pomysł..." rows={3} /></div>
          </div>
          <DialogFooter><Button onClick={handleAddIdea} disabled={!newIdeaTitle.trim()}>Dodaj pomysł</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Link Dialog ──────────────────────────────────────── */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Dodaj link</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nazwa</Label><Input value={newLinkName} onChange={e => setNewLinkName(e.target.value)} placeholder="Nazwa linku..." /></div>
            <div><Label>URL</Label><Input value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} placeholder="https://..." /></div>
          </div>
          <DialogFooter><Button onClick={handleAddLink} disabled={!newLinkName.trim() || !newLinkUrl.trim()}>Dodaj link</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Invoice Edit Dialog ──────────────────────────────── */}
      <Dialog open={showInvoiceEdit} onOpenChange={setShowInvoiceEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Dane do faktury</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nazwa firmy</Label><Input value={invoiceForm.company_name} onChange={e => setInvoiceForm(f => ({ ...f, company_name: e.target.value }))} /></div>
            <div><Label>NIP</Label><Input value={invoiceForm.nip} onChange={e => setInvoiceForm(f => ({ ...f, nip: e.target.value }))} /></div>
            <div><Label>Ulica</Label><Input value={invoiceForm.street} onChange={e => setInvoiceForm(f => ({ ...f, street: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Kod pocztowy</Label><Input value={invoiceForm.postal_code} onChange={e => setInvoiceForm(f => ({ ...f, postal_code: e.target.value }))} /></div>
              <div><Label>Miasto</Label><Input value={invoiceForm.city} onChange={e => setInvoiceForm(f => ({ ...f, city: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={saveInvoiceData}>Zapisz</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
