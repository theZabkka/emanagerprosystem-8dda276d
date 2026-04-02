import { useState, useEffect, useMemo, useRef, useCallback } from "react";

import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  ChevronRight, Plus, Send, Clock, Play, FileText, Link as LinkIcon,
  CheckCircle2, MessageCircle, History, AlertTriangle, Eye, Zap, ShieldCheck,
  Upload, Timer, UserPlus, Edit3, Bug, Lock, X, Trash2, HelpCircle, ArrowLeft, CalendarIcon, Building2,
  PanelRightClose, Activity
} from "lucide-react";
import { NotUnderstoodModal, ChecklistBlockModal } from "@/components/tasks/WorkflowModals";
import { VerificationSendModal } from "@/components/tasks/VerificationSendModal";
import { RejectionModal } from "@/components/tasks/RejectionModal";
import { useRole } from "@/hooks/useRole";
import { StatusTimeline } from "@/components/tasks/StatusTimeline";
import { DescriptionCard } from "@/components/tasks/DescriptionCard";
import { statusLabels, statusColors, TERMINAL_STATUSES } from "@/lib/statusConfig";
import { useTimerStore } from "@/hooks/useTimerStore";
import { useVerificationLock } from "@/hooks/useVerificationLock";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";

const priorityLabels: Record<string, string> = { critical: "PILNY", high: "WYSOKI", medium: "ŚREDNI", low: "NISKI" };
const priorityColors: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-950",
  medium: "border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-950",
  low: "border-muted text-muted-foreground",
};

const roleLabels: Record<string, string> = { primary: "Główny", collaborator: "Współpracownik", reviewer: "Recenzent" };

const briefFields = [
  { key: "brief_goal", label: "Cel zadania" },
  { key: "brief_deliverable", label: "Co dostarczyć" },
  { key: "brief_format", label: "Format dostarczenia" },
  { key: "brief_input_materials", label: "Materiały wejściowe" },
  { key: "brief_dont_do", label: "Czego NIE robić" },
  { key: "brief_inspiration", label: "Wzorzec / inspiracja" },
];

const URL_REGEX = /(https?:\/\/[^\s<]+)/g;
function linkifyText(text: string): React.ReactNode[] {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) =>
    URL_REGEX.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{part}</a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

// ─── AvatarGroup ───────────────────────────────────────────────────
function AvatarGroup({ assignments, max = 3 }: { assignments: any[]; max?: number }) {
  const visible = assignments.slice(0, max);
  const remaining = assignments.length - max;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((a: any) => (
        <Avatar key={a.user_id} className="h-7 w-7 border-2 border-background">
          <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
            {a.profiles?.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?"}
          </AvatarFallback>
        </Avatar>
      ))}
      {remaining > 0 && (
        <div className="h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center">
          <span className="text-[9px] font-bold text-muted-foreground">+{remaining}</span>
        </div>
      )}
    </div>
  );
}

// ─── Demo state store (mutable for demo interactivity) ────────────
export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isClient, currentRole } = useRole();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [commentText, setCommentText] = useState("");
  const [commentType, setCommentType] = useState("internal");
  const [commentFilter, setCommentFilter] = useState("all");
  const [briefOpen, setBriefOpen] = useState(false);
  const [briefForm, setBriefForm] = useState<Record<string, string>>({});
  const [assignOpen, setAssignOpen] = useState(false);
  const [newChecklistName, setNewChecklistName] = useState("");
  const [newChecklistItemTexts, setNewChecklistItemTexts] = useState<Record<string, string>>({});
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [manualMinutes, setManualMinutes] = useState("");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [notUnderstoodOpen, setNotUnderstoodOpen] = useState(false);
  const [checklistBlockOpen, setChecklistBlockOpen] = useState(false);
  const [verificationSendOpen, setVerificationSendOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [clientReviewOpen, setClientReviewOpen] = useState(false);
  const [correctionSeverity, setCorrectionSeverity] = useState<"normal" | "critical">("normal");
  const [correctionText, setCorrectionText] = useState("");
  const [rejectReviewOpen, setRejectReviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { refreshAfterVerification } = useVerificationLock();
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<"discussion" | "activity">("discussion");

  // ─── Queries ─────────────────────────────────────────────────────
  const { data: task, isLoading } = useQuery({
    queryKey: ["task", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*, clients(name), projects(name)").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: allClients } = useQuery({
    queryKey: ["all-clients-picker"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: assignments } = useQuery({
    queryKey: ["task-assignments", id],
    queryFn: async () => {
      const { data } = await supabase.from("task_assignments").select("*, profiles:user_id(full_name, avatar_url)").eq("task_id", id!);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: allProfiles } = useStaffMembers();

  const { data: comments } = useQuery({
    queryKey: ["comments", id],
    queryFn: async () => {
      const { data } = await supabase.from("comments").select("*, profiles:user_id(full_name, role)").eq("task_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: timeLogs } = useQuery({
    queryKey: ["time-logs", id],
    queryFn: async () => {
      const { data } = await supabase.from("time_logs").select("*, profiles:user_id(full_name)").eq("task_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: checklists } = useQuery({
    queryKey: ["checklists", id],
    queryFn: async () => {
      const { data: cls } = await supabase.from("checklists").select("*, checklist_items(*)").eq("task_id", id!).order("created_at");
      return (cls || []).map((cl: any) => ({ ...cl, items: cl.checklist_items || [] }));
    },
    enabled: !!id,
  });

  const { data: materials } = useQuery({
    queryKey: ["materials", id],
    queryFn: async () => {
      const { data } = await supabase.from("task_materials").select("*, profiles:uploaded_by(full_name)").eq("task_id", id!).order("created_at");
      return data || [];
    },
    enabled: !!id,
  });

  const { data: statusHistory } = useQuery({
    queryKey: ["status-history", id],
    queryFn: async () => {
      const { data } = await supabase.from("task_status_history").select("*, profiles:changed_by(full_name)").eq("task_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: corrections } = useQuery({
    queryKey: ["task-corrections", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("task_corrections")
        .select("*, profiles:created_by(full_name)")
        .eq("task_id", id!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  // Real-time
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`task-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `task_id=eq.${id}` }, () => queryClient.invalidateQueries({ queryKey: ["comments", id] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "time_logs", filter: `task_id=eq.${id}` }, () => queryClient.invalidateQueries({ queryKey: ["time-logs", id] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "task_status_history", filter: `task_id=eq.${id}` }, () => queryClient.invalidateQueries({ queryKey: ["status-history", id] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "task_assignments", filter: `task_id=eq.${id}` }, () => queryClient.invalidateQueries({ queryKey: ["task-assignments", id] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "checklists", filter: `task_id=eq.${id}` }, () => queryClient.invalidateQueries({ queryKey: ["checklists", id] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "task_materials", filter: `task_id=eq.${id}` }, () => queryClient.invalidateQueries({ queryKey: ["materials", id] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "task_corrections", filter: `task_id=eq.${id}` }, () => queryClient.invalidateQueries({ queryKey: ["task-corrections", id] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, queryClient]);

  const timer = useTimerStore(id);

  // ─── Actions ─────────────────────────────────────────────────────

  async function handleStatusChange(newStatus: string) {
    if (!task || newStatus === task.status) return;
    const taskAssigns = assignments || [];
    if (taskAssigns.length === 0) {
      toast.error("Nie można zmienić statusu! Przypisz najpierw osobę do tego zadania.");
      return;
    }
    if (task.status === "in_progress" && newStatus === "review") {
      const allComplete = checklists?.every((cl: any) =>
        (cl.items || []).length === 0 || (cl.items || []).every((i: any) => i.is_completed || i.is_na)
      ) ?? true;
      if (!allComplete) {
        setChecklistBlockOpen(true);
        return;
      }
    }
    if (newStatus === "client_review" && task.status !== "review" && task.status !== "corrections") {
      toast.error("Zadanie może trafić do akceptacji klienta tylko ze statusu Weryfikacja lub Poprawki");
      return;
    }
    if ((task.status === "review" || task.status === "corrections") && newStatus === "client_review") {
      if (totalLogged <= 0) {
        toast.error("Brak zalogowanego czasu. Musisz zalogować czas pracy przed wysłaniem zadania do klienta.");
        return;
      }
      setVerificationSendOpen(true);
      return;
    }
    await executeStatusChange(newStatus);
  }

  async function executeStatusChange(newStatus: string) {
    if (!task) return;
    if ((newStatus === "closed" || newStatus === "cancelled" || newStatus === "done") && timer.isRunning) {
      const totalSecs = timer.stop();
      if (totalSecs >= 60) {
        const minutes = Math.round(totalSecs / 60);
        await logTime(minutes);
      }
    }
    const { error } = await supabase.rpc("change_task_status", {
      _task_id: task.id,
      _new_status: newStatus as any,
      _changed_by: user?.id!,
    });
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["task", id] });
    queryClient.invalidateQueries({ queryKey: ["status-history", id] });
    refreshAfterVerification();
    toast.success(`Status zmieniony na ${statusLabels[newStatus]}`);
  }

  async function handleNotUnderstood(reason: string) {
    if (!task || !user) return;
    await supabase.from("tasks").update({
      not_understood: true,
      not_understood_at: new Date().toISOString(),
      is_misunderstood: true,
      misunderstood_by: user.id,
      misunderstood_reason: reason || null,
    } as any).eq("id", task.id);
    await supabase.from("activity_log").insert({
      user_id: user.id,
      action: "misunderstood_reported",
      entity_type: "task",
      entity_id: task.id,
      entity_name: task.title,
      details: { reason: reason || null },
    });
    if (reason.trim()) {
      await supabase.from("comments").insert({
        task_id: task.id, user_id: user.id, content: `❓ Nie rozumiem polecenia: ${reason}`, type: "internal",
      });
    }
    queryClient.invalidateQueries({ queryKey: ["task", id] });
    queryClient.invalidateQueries({ queryKey: ["comments", id] });
    toast.success("Zgłoszono niezrozumienie zadania — koordynator został powiadomiony");
  }

  async function clearNotUnderstood() {
    if (!task || !user) return;
    await supabase.from("tasks").update({
      not_understood: false,
      not_understood_at: null,
      is_misunderstood: false,
      misunderstood_by: null,
      misunderstood_reason: null,
    } as any).eq("id", task.id);
    await supabase.from("activity_log").insert({
      user_id: user.id,
      action: "misunderstood_resolved",
      entity_type: "task",
      entity_id: task.id,
      entity_name: task.title,
    });
    queryClient.invalidateQueries({ queryKey: ["task", id] });
    toast.success("Oznaczono jako wyjaśnione");
  }

  async function handleClientAccept() {
    if (!task) return;
    const { error } = await supabase.rpc("change_task_status", {
      _task_id: task.id, _new_status: "client_verified" as any, _changed_by: user?.id!,
    });
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["task", id] });
    queryClient.invalidateQueries({ queryKey: ["status-history", id] });
    refreshAfterVerification();
    toast.success("Zadanie zaakceptowane!");
  }

  async function handleClientReject() {
    if (!task || !correctionText.trim()) { toast.error("Opisz co wymaga poprawki"); return; }
    await supabase.from("task_corrections").insert({
      task_id: task.id, created_by: user?.id, severity: correctionSeverity, description: correctionText,
    });
    await supabase.from("tasks").update({ correction_severity: correctionSeverity } as any).eq("id", task.id);
    const { error } = await supabase.rpc("change_task_status", {
      _task_id: task.id, _new_status: "corrections" as any, _changed_by: user?.id!,
    });
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["task", id] });
    queryClient.invalidateQueries({ queryKey: ["task-corrections", id] });
    queryClient.invalidateQueries({ queryKey: ["status-history", id] });
    refreshAfterVerification();
    setClientReviewOpen(false);
    setCorrectionText("");
    setCorrectionSeverity("normal");
    toast.success("Poprawki zgłoszone");
  }

  async function handleRejectFromReview(category: string, comment: string) {
    if (!task || !user?.id) return;
    const primaryAssign = (assignments || []).find((a: any) => a.role === "primary");
    await supabase.from("task_rejections").insert({
      task_id: task.id,
      project_id: task.project_id || null,
      rejected_by: user.id,
      assigned_to: primaryAssign?.user_id || null,
      reason_category: category,
      comment: comment || null,
    } as any);
    const commentContent = `🔴 Odrzucono: [${category}]${comment ? ` — ${comment}` : ""}`;
    await supabase.from("comments").insert({
      task_id: task.id,
      user_id: user.id,
      content: commentContent,
      type: "internal",
    });
    const { error } = await supabase.rpc("change_task_status", {
      _task_id: task.id,
      _new_status: "corrections" as any,
      _changed_by: user.id,
      _note: commentContent,
    });
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["task", id] });
    queryClient.invalidateQueries({ queryKey: ["comments", id] });
    queryClient.invalidateQueries({ queryKey: ["status-history", id] });
    refreshAfterVerification();
    setRejectReviewOpen(false);
    toast.success("Zadanie odrzucone — przeniesiono do POPRAWEK");
  }

  function openBriefEditor() {
    if (!task) return;
    const form: Record<string, string> = {};
    briefFields.forEach(f => { form[f.key] = (task as any)[f.key] || ""; });
    setBriefForm(form);
    setBriefOpen(true);
  }

  async function saveBrief() {
    if (!task) return;
    const { error } = await supabase.from("tasks").update(briefForm as any).eq("id", task.id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["task", id] });
    setBriefOpen(false);
    toast.success("Brief zapisany");
  }

  async function addAssignment(userId: string, role: string = "collaborator") {
    const { error } = await supabase.from("task_assignments").insert({ task_id: id!, user_id: userId, role: role as any });
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["task-assignments", id] });
    toast.success("Osoba przypisana");
  }

  async function removeAssignment(userId: string) {
    await supabase.from("task_assignments").delete().eq("task_id", id!).eq("user_id", userId);
    queryClient.invalidateQueries({ queryKey: ["task-assignments", id] });
    toast.success("Osoba usunięta");
  }

  async function addChecklist() {
    if (!newChecklistName.trim()) return;
    const { error } = await supabase.from("checklists").insert({ task_id: id!, title: newChecklistName });
    if (error) { toast.error(error.message); return; }
    setNewChecklistName("");
    queryClient.invalidateQueries({ queryKey: ["checklists", id] });
    toast.success("Lista kontrolna dodana");
  }

  async function addChecklistItem(checklistId: string) {
    const text = newChecklistItemTexts[checklistId]?.trim();
    if (!text) return;
    await supabase.from("checklist_items").insert({ checklist_id: checklistId, title: text });
    queryClient.invalidateQueries({ queryKey: ["checklists", id] });
    setNewChecklistItemTexts(prev => ({ ...prev, [checklistId]: "" }));
  }

  async function toggleChecklistItem(itemId: string, completed: boolean) {
    await supabase.from("checklist_items").update({ is_completed: !completed }).eq("id", itemId);
    queryClient.invalidateQueries({ queryKey: ["checklists", id] });
  }

  async function uploadFile(file: File) {
    if (!user) return;
    const filePath = `${id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("task_materials").upload(filePath, file);
    if (uploadError) { toast.error(uploadError.message); return; }
    const { data: urlData } = supabase.storage.from("task_materials").getPublicUrl(filePath);
    await supabase.from("task_materials").insert({
      task_id: id!, name: file.name, type: "file", url: urlData.publicUrl, uploaded_by: user.id,
    });
    queryClient.invalidateQueries({ queryKey: ["materials", id] });
    toast.success("Plik przesłany");
  }

  async function addLinkMaterial() {
    if (!linkName.trim() || !linkUrl.trim()) return;
    if (!user) return;
    await supabase.from("task_materials").insert({
      task_id: id!, name: linkName, type: "link", url: linkUrl, uploaded_by: user.id,
    });
    queryClient.invalidateQueries({ queryKey: ["materials", id] });
    setLinkDialogOpen(false); setLinkName(""); setLinkUrl("");
    toast.success("Link dodany");
  }

  async function deleteMaterial(materialId: string) {
    await supabase.from("task_materials").delete().eq("id", materialId);
    queryClient.invalidateQueries({ queryKey: ["materials", id] });
    toast.success("Materiał usunięty");
  }

  async function toggleMaterialVisibility(materialId: string, visible: boolean) {
    const { error } = await supabase.from("task_materials").update({ is_visible_to_client: visible } as any).eq("id", materialId);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["materials", id] });
    toast.success(visible ? "Materiał widoczny dla klienta" : "Materiał ukryty przed klientem");
  }

  async function logTime(minutes: number) {
    if (minutes <= 0) return;
    if (!user) return;
    const { error } = await supabase.from("time_logs").insert({ task_id: id!, user_id: user.id, duration: minutes });
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["time-logs", id] });
    toast.success(`Zalogowano ${minutes} min`);
  }

  function logManualTime() {
    const mins = parseInt(manualMinutes);
    if (isNaN(mins) || mins <= 0) { toast.error("Podaj poprawną liczbę minut"); return; }
    logTime(mins);
    setManualMinutes("");
  }

  async function stopTimer() {
    const totalSecs = timer.stop();
    if (totalSecs < 60) return;
    const minutes = Math.round(totalSecs / 60);
    await logTime(minutes);
  }

  async function addComment() {
    if (!commentText.trim()) return;
    if (!user) return;
    const { error } = await supabase.from("comments").insert({ task_id: id!, user_id: user.id, content: commentText, type: commentType });
    if (error) { toast.error(error.message); return; }
    setCommentText("");
    queryClient.invalidateQueries({ queryKey: ["comments", id] });
    toast.success("Komentarz dodany");
  }

  async function handleClientComment() {
    if (!commentText.trim() || !user) return;
    const { error } = await supabase.from("comments").insert({ task_id: id!, user_id: user.id, content: commentText, type: "client" });
    if (error) { toast.error(error.message); return; }
    setCommentText("");
    queryClient.invalidateQueries({ queryKey: ["comments", id] });
    toast.success("Wiadomość wysłana");
  }

  function formatTimer(s: number) {
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  }

  function formatDuration(minutes: number) {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  const canEditInline = !isClient && !isPreviewMode;

  async function handleClientChange(newClientId: string | null) {
    if (!task) return;
    const { error } = await supabase.from("tasks").update({ client_id: newClientId, updated_at: new Date().toISOString() } as any).eq("id", task.id);
    if (error) { toast.error("Błąd aktualizacji klienta"); return; }
    queryClient.invalidateQueries({ queryKey: ["task", id] });
    setClientPickerOpen(false);
    toast.success(newClientId ? "Klient przypisany" : "Powiązanie z klientem usunięte");
  }

  const saveTitle = useCallback(async () => {
    if (!task || isSavingTitle) return;
    const trimmed = titleValue.trim();
    if (!trimmed || trimmed === task.title) { setIsEditingTitle(false); return; }
    setIsSavingTitle(true);
    const { error } = await supabase.from("tasks").update({ title: trimmed, updated_at: new Date().toISOString() } as any).eq("id", task.id);
    setIsSavingTitle(false);
    if (error) { toast.error("Błąd zapisu tytułu"); return; }
    queryClient.invalidateQueries({ queryKey: ["task", id] });
    setIsEditingTitle(false);
    toast.success("Tytuł zaktualizowany");
  }, [task, titleValue, isSavingTitle, queryClient, id]);

  async function handlePriorityChange(newPriority: string) {
    if (!task || newPriority === task.priority) return;
    const { error } = await supabase.from("tasks").update({ priority: newPriority as any, updated_at: new Date().toISOString() } as any).eq("id", task.id);
    if (error) { toast.error("Błąd aktualizacji priorytetu"); return; }
    queryClient.invalidateQueries({ queryKey: ["task", id] });
    toast.success(`Priorytet zmieniony na ${priorityLabels[newPriority]}`);
  }

  async function handleDeadlineChange(newDate: Date | undefined) {
    if (!task) return;
    const { error } = await supabase.from("tasks").update({
      due_date: newDate ? `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}` : null,
      updated_at: new Date().toISOString(),
    } as any).eq("id", task.id);
    if (error) { toast.error("Błąd aktualizacji terminu"); return; }
    queryClient.invalidateQueries({ queryKey: ["task", id] });
    toast.success(newDate ? `Termin ustawiony na ${format(newDate, "dd.MM.yyyy")}` : "Termin usunięty");
  }

  const briefFilledCount = useMemo(() => {
    if (!task) return 0;
    return briefFields.filter(f => (task as any)[f.key]).length;
  }, [task]);

  const totalLogged = timeLogs?.reduce((sum: number, l: any) => sum + l.duration, 0) || 0;
  const isOverdue = task?.due_date && new Date(task.due_date) < new Date() && task.status !== "done" && task.status !== "cancelled";
  const hasNoAssignment = !assignments || assignments.length === 0;

  const filteredComments = useMemo(() => {
    if (!comments) return [];
    if (commentFilter === "all") return comments;
    return comments.filter((c: any) => c.type === commentFilter);
  }, [comments, commentFilter]);

  const unassignedProfiles = useMemo(() => {
    if (!allProfiles || !assignments) return [];
    const assignedIds = new Set(assignments.map((a: any) => a.user_id));
    return allProfiles.filter((p: any) => !assignedIds.has(p.id));
  }, [allProfiles, assignments]);

  if (isLoading) return <AppLayout title="Zadanie"><div className="p-8 text-muted-foreground">Ładowanie...</div></AppLayout>;
  if (!task) return <AppLayout title="Zadanie"><div className="p-8 text-muted-foreground">Nie znaleziono zadania.</div></AppLayout>;

  const showAssignOverlay = hasNoAssignment && !isClient && !isPreviewMode;
  const isWideScreen = !isMobile; // We'll use CSS for the 1280px breakpoint

  // ─── Comments section (reusable for both inline & sheet) ────────
  const commentsContent = (
    <div className="flex flex-col h-full">
      {/* Filter tabs */}
      <div className="flex items-center gap-1 p-3 border-b border-border shrink-0">
        <button
          onClick={() => setRightPanelTab("discussion")}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
            rightPanelTab === "discussion" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
          )}
        >
          <MessageCircle className="h-3 w-3 inline mr-1" />Dyskusja
        </button>
        <button
          onClick={() => setRightPanelTab("activity")}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
            rightPanelTab === "activity" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
          )}
        >
          <Activity className="h-3 w-3 inline mr-1" />Aktywność
        </button>
        {!isPreviewMode && !isClient && (
          <div className="ml-auto flex gap-1">
            {["all", "internal", "client"].map(f => (
              <Button key={f} variant={commentFilter === f ? "default" : "ghost"} size="sm" className="text-[10px] h-6 px-2"
                onClick={() => setCommentFilter(f)}>
                {f === "all" ? "Wszystkie" : f === "internal" ? "Wewnętrzne" : "Klient"}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Comments / Activity list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
        {rightPanelTab === "discussion" ? (
          <>
            {(() => {
              let displayComments = filteredComments;
              if (isClient) {
                displayComments = (comments || []).filter((c: any) => c.type !== "internal");
              } else if (isPreviewMode) {
                displayComments = filteredComments.filter((c: any) => c.type !== "internal");
              }
              return displayComments.length > 0 ? displayComments.map((c: any) => (
                <div key={c.id} className="space-y-1.5">
                  <div className="flex gap-2.5">
                    <Avatar className="h-6 w-6 mt-0.5 shrink-0">
                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                        {(c.profiles?.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold">{c.profiles?.full_name || "?"}</span>
                        {!isClient && c.profiles?.role && (
                          <Badge variant="secondary" className="text-[8px] h-3.5 capitalize px-1">{c.profiles.role}</Badge>
                        )}
                        {!isClient && (
                          <Badge variant={c.type === "client" ? "default" : "outline"} className="text-[8px] h-3.5 px-1">
                            {c.type === "client" ? "Klient" : "Wew."}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-auto">{new Date(c.created_at).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p className="text-sm mt-0.5">{c.content}</p>
                      {c.client_reply && (
                        <div className="mt-1.5 bg-primary/5 border border-primary/20 rounded-md px-2.5 py-1.5">
                          <p className="text-[10px] font-semibold text-primary uppercase mb-0.5">Odpowiedź klienta</p>
                          <p className="text-xs">{c.client_reply}</p>
                        </div>
                      )}
                      {isClient && c.requires_client_reply && !c.client_reply && (
                        <ClientReplyInput commentId={c.id} taskId={id!} />
                      )}
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-muted-foreground py-6 text-center">Brak komentarzy.</p>
              );
            })()}
          </>
        ) : (
          /* Activity tab - show status history + corrections */
          <div className="space-y-3">
            {statusHistory && statusHistory.length > 0 ? (
              [...statusHistory].reverse().map((h: any) => (
                <div key={h.id} className="flex items-start gap-2 text-xs">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="h-2.5 w-2.5 text-primary/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <Badge className={`text-[8px] ${statusColors[h.old_status] || "bg-muted"}`}>
                        {statusLabels[h.old_status] || h.old_status || "—"}
                      </Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge className={`text-[8px] ${statusColors[h.new_status] || "bg-muted"}`}>
                        {statusLabels[h.new_status] || h.new_status}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-0.5">
                      {h.profiles?.full_name || "?"} • {new Date(h.created_at).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {h.note && <p className="text-muted-foreground italic mt-0.5">{h.note}</p>}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-6 text-center">Brak aktywności.</p>
            )}
            {corrections && corrections.length > 0 && (
              <div className="pt-2 border-t border-border space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Poprawki</p>
                {corrections.map((c: any) => (
                  <div key={c.id} className={cn(
                    "rounded-md border p-2 text-xs space-y-1",
                    c.severity === "critical" ? "border-destructive/40 bg-destructive/5" : "border-amber-400/40 bg-amber-500/5"
                  )}>
                    <div className="flex items-center gap-1.5">
                      <Badge className={cn("text-[8px]", c.severity === "critical" ? "bg-destructive text-destructive-foreground" : "bg-amber-500/15 text-amber-700 border-amber-400/40")}>
                        {c.severity === "critical" ? "KRYTYCZNE" : "Drobne"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground ml-auto">{new Date(c.created_at).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <p>{c.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky comment input at bottom */}
      {!isPreviewMode && (
        <div className="border-t border-border p-3 shrink-0 bg-background">
          {!isClient ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Checkbox id="internal-comment-panel" checked={commentType === "internal"} onCheckedChange={(v) => setCommentType(v ? "internal" : "client")} className="h-3.5 w-3.5" />
                  <Label htmlFor="internal-comment-panel" className="text-[10px] flex items-center gap-1 cursor-pointer">
                    <Lock className="h-2.5 w-2.5 text-amber-500" />Wewnętrzny
                  </Label>
                </div>
              </div>
              <div className="flex gap-2 items-end">
                <Textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Napisz komentarz..."
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(); } }}
                  className="min-h-[44px] max-h-[100px] resize-none text-sm flex-1" />
                <Button size="icon" onClick={addComment} disabled={!commentText.trim()} className="h-9 w-9 shrink-0"><Send className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 items-end">
              <Textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Napisz wiadomość..."
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleClientComment(); } }}
                className="min-h-[44px] max-h-[100px] resize-none text-sm flex-1" />
              <Button size="icon" onClick={handleClientComment} disabled={!commentText.trim()} className="h-9 w-9 shrink-0"><Send className="h-3.5 w-3.5" /></Button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <AppLayout title={task.title}>
      {/* Full-height container - cancel parent padding, block global scroll */}
      <div className="-m-6 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">

        {/* ─── Top Header Bar ─── */}
        <div className="shrink-0 border-b border-border bg-background px-4 py-2.5 space-y-2">
          {/* Unassigned overlay */}
          {showAssignOverlay && (
            <div className="flex items-center gap-3 p-2.5 rounded-lg border-2 border-destructive bg-destructive/5">
              <div className="p-1.5 rounded-full bg-destructive/10">
                <UserPlus className="h-4 w-4 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-destructive">Zadanie nie ma przypisanej osoby!</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {(allProfiles || []).map((p: any) => (
                    <button key={p.id} onClick={() => addAssignment(p.id, "primary")}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] border rounded-full hover:bg-accent transition-colors bg-background">
                      <Avatar className="h-3.5 w-3.5">
                        <AvatarFallback className="text-[7px] bg-primary/10 text-primary font-bold">
                          {p.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      {p.full_name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Preview banner */}
          {isPreviewMode && (
            <div className="flex items-center justify-between gap-4 bg-orange-500 text-white rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span className="text-xs font-semibold">Tryb podglądu klienta</span>
              </div>
              <Button size="sm" className="bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-[10px] h-7" onClick={() => setIsPreviewMode(false)}>
                Wyjdź z podglądu
              </Button>
            </div>
          )}

          {/* Misunderstood banner */}
          {(task as any).is_misunderstood && !isPreviewMode && !isClient && (
            <MisunderstoodBanner task={task} onResolve={clearNotUnderstood} />
          )}

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {isClient ? (
              <Link to="/dashboard" className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-medium">
                <ArrowLeft className="h-3 w-3" />Wróć
              </Link>
            ) : (
              <>
                <Link to="/tasks" className="hover:text-foreground transition-colors flex items-center gap-1">
                  <ArrowLeft className="h-3 w-3" />Zadania
                </Link>
                {task.client_id && (task as any).clients?.name && (
                  <>
                    <ChevronRight className="h-2.5 w-2.5 shrink-0" />
                    <Link to={`/clients/${task.client_id}`} className="hover:text-foreground hover:underline truncate max-w-[150px]">{(task as any).clients.name}</Link>
                  </>
                )}
                {task.project_id && (task as any).projects?.name && (
                  <>
                    <ChevronRight className="h-2.5 w-2.5 shrink-0" />
                    <Link to={`/projects/${task.project_id}`} className="hover:text-foreground hover:underline truncate max-w-[150px]">{(task as any).projects.name}</Link>
                  </>
                )}
              </>
            )}
          </div>

          {/* Title row + Assignees + Deadline */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Title */}
            <div className="flex-1 min-w-0">
              {canEditInline && isEditingTitle ? (
                <Input
                  ref={titleInputRef}
                  autoFocus
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  disabled={isSavingTitle}
                  className="text-lg font-bold h-auto py-0.5 px-1.5"
                  onBlur={saveTitle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); saveTitle(); }
                    if (e.key === "Escape") { setIsEditingTitle(false); setTitleValue(task.title); }
                  }}
                />
              ) : (
                <div
                  className={cn("group flex items-center gap-1.5", canEditInline && "cursor-pointer")}
                  onClick={() => {
                    if (!canEditInline) return;
                    setTitleValue(task.title);
                    setIsEditingTitle(true);
                  }}
                >
                  <h1 className="text-lg font-bold truncate">{task.title}</h1>
                  {canEditInline && <Edit3 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                </div>
              )}
            </div>

            {/* Assignees AvatarGroup */}
            {!isClient && !isPreviewMode && assignments && assignments.length > 0 && (
              <Popover open={assignOpen} onOpenChange={setAssignOpen}>
                <PopoverTrigger asChild>
                  <button className="cursor-pointer shrink-0">
                    <AvatarGroup assignments={assignments} />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="end">
                  <p className="text-xs font-semibold mb-2">Przypisane osoby</p>
                  <div className="space-y-1 mb-2">
                    {assignments.map((a: any) => (
                      <div key={a.user_id} className="flex items-center gap-2 px-2 py-1 rounded-sm group">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                            {a.profiles?.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm flex-1">{a.profiles?.full_name}</span>
                        <span className="text-[10px] text-muted-foreground">{roleLabels[a.role] || a.role}</span>
                        <button onClick={() => removeAssignment(a.user_id)}
                          className="opacity-0 group-hover:opacity-100 text-destructive transition-opacity">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-2" />
                  <p className="text-xs font-semibold mb-1.5">Dodaj osobę</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {unassignedProfiles.map((p: any) => (
                      <button key={p.id} onClick={() => { addAssignment(p.id); setAssignOpen(false); }}
                        className="w-full flex items-center gap-2 px-2 py-1 rounded-sm hover:bg-accent transition-colors text-left text-sm">
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-bold">
                            {p.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        {p.full_name}
                      </button>
                    ))}
                    {unassignedProfiles.length === 0 && <p className="text-[10px] text-muted-foreground py-1">Wszyscy przypisani</p>}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Add person button when no assignments */}
            {!isClient && !isPreviewMode && hasNoAssignment && (
              <Popover open={assignOpen} onOpenChange={setAssignOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs gap-1 h-7 shrink-0"><UserPlus className="h-3 w-3" />Przypisz</Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="end">
                  <p className="text-xs font-semibold mb-2">Wybierz osobę</p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {(allProfiles || []).map((p: any) => (
                      <button key={p.id} onClick={() => { addAssignment(p.id, "primary"); setAssignOpen(false); }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent transition-colors text-left text-sm">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                            {p.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        {p.full_name}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Deadline */}
            <div className="shrink-0">
              {canEditInline ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("text-xs gap-1 h-7", isOverdue && "border-destructive text-destructive")}>
                      <CalendarIcon className="h-3 w-3" />
                      {task.due_date ? format(new Date(task.due_date), "dd.MM.yyyy") : "Termin"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={task.due_date ? new Date(task.due_date) : undefined}
                      onSelect={(date) => handleDeadlineChange(date)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                    {task.due_date && (
                      <div className="px-3 pb-3">
                        <Button variant="ghost" size="sm" className="w-full text-xs text-destructive" onClick={() => handleDeadlineChange(undefined)}>
                          <X className="h-3 w-3 mr-1" />Usuń termin
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              ) : task.due_date ? (
                <span className={cn("text-xs font-semibold", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                  {new Date(task.due_date).toLocaleDateString("pl-PL")}
                </span>
              ) : null}
            </div>
          </div>

          {/* Tags + Action buttons row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[9px] font-mono h-5">#{task.id.slice(0, 8)}</Badge>
            {!isPreviewMode && !isClient ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="cursor-pointer">
                    <Badge className={`text-[9px] font-bold ${statusColors[task.status] || "bg-muted"} hover:opacity-80 transition-opacity`}>
                      {statusLabels[task.status] || task.status}
                    </Badge>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1" align="start">
                  {Object.entries(statusLabels).map(([k, v]) => (
                    <button key={k} onClick={() => handleStatusChange(k)}
                      className={`w-full text-left px-3 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors ${k === task.status ? "font-bold bg-accent/50" : ""}`}>
                      <Badge className={`text-[9px] ${statusColors[k]}`}>{v}</Badge>
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            ) : (
              <Badge className={`text-[9px] font-bold ${statusColors[task.status] || "bg-muted"}`}>
                {statusLabels[task.status] || task.status}
              </Badge>
            )}
            {canEditInline ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="cursor-pointer">
                    <Badge className={`text-[9px] font-bold border ${priorityColors[task.priority] || ""} hover:opacity-80 transition-opacity`}>
                      {priorityLabels[task.priority] || task.priority} ▾
                    </Badge>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-36 p-1" align="start">
                  {Object.entries(priorityLabels).map(([k, v]) => (
                    <button key={k} onClick={() => handlePriorityChange(k)}
                      className={`w-full text-left px-3 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors ${k === task.priority ? "font-bold bg-accent/50" : ""}`}>
                      <Badge className={`text-[9px] border ${priorityColors[k]}`}>{v}</Badge>
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            ) : (
              <Badge className={`text-[9px] font-bold border ${priorityColors[task.priority] || ""}`}>{priorityLabels[task.priority] || task.priority}</Badge>
            )}
            {hasNoAssignment && <Badge className="bg-destructive text-destructive-foreground text-[9px] font-bold h-5">NIEPRZYPISANE!</Badge>}
            {isOverdue && <Badge className="bg-destructive text-destructive-foreground text-[9px] font-bold h-5">PO TERMINIE</Badge>}
            {task.type && <Badge variant="secondary" className="text-[9px] h-5">{task.type}</Badge>}
            {canEditInline ? (
              <Popover open={clientPickerOpen} onOpenChange={setClientPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="text-[10px] gap-1 h-5 px-2">
                    <Building2 className="h-2.5 w-2.5" />
                    {task.client_id && (task as any).clients?.name ? (task as any).clients.name : "+ Klient"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Szukaj klienta..." />
                    <CommandList>
                      <CommandEmpty>Nie znaleziono klienta</CommandEmpty>
                      <CommandGroup>
                        <CommandItem onSelect={() => handleClientChange(null)} className="text-muted-foreground">
                          <X className="h-3 w-3 mr-2" /> Brak klienta
                        </CommandItem>
                        {(allClients || []).map((c: any) => (
                          <CommandItem key={c.id} value={c.name} onSelect={() => handleClientChange(c.id)}>
                            <Building2 className="h-3 w-3 mr-2" />
                            {c.name}
                            {c.id === task.client_id && <CheckCircle2 className="h-3 w-3 ml-auto text-primary" />}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : task.client_id && (task as any).clients?.name ? (
              <Badge variant="outline" className="text-[9px] gap-1 h-5"><Building2 className="h-2.5 w-2.5" />{(task as any).clients.name}</Badge>
            ) : null}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Action buttons */}
            {!isClient && !isPreviewMode && (task.status === "review" || task.status === "corrections") && (
              <Button size="sm" className="text-[10px] gap-1 h-6 bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => {
                  if (totalLogged <= 0) {
                    toast.error("Brak zalogowanego czasu. Musisz zalogować czas pracy przed wysłaniem zadania do klienta.");
                    return;
                  }
                  setVerificationSendOpen(true);
                }}>
                <ShieldCheck className="h-2.5 w-2.5" />Do akceptacji klienta
              </Button>
            )}
            {!isClient && !isPreviewMode && task.status === "review" && (
              <Button variant="destructive" size="sm" className="text-[10px] gap-1 h-6" onClick={() => setRejectReviewOpen(true)}>
                <AlertTriangle className="h-2.5 w-2.5" />Odrzuć
              </Button>
            )}
            {!isClient && !isPreviewMode && (
              <Button variant="outline" size="sm" className="text-[10px] gap-1 h-6" onClick={() => setIsPreviewMode(true)}><Eye className="h-2.5 w-2.5" />Podgląd</Button>
            )}
            {!isClient && !isPreviewMode && !["review", "client_review", "client_verified", "done", "closed", "cancelled"].includes(task.status || "") && (
              <Button variant="outline" size="sm" className="text-[10px] gap-1 h-6 border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10"
                onClick={async () => {
                  try {
                    const { error } = await supabase.rpc("change_task_status", {
                      _task_id: task.id, _new_status: "review", _changed_by: user?.id,
                      _note: "Przekazano do weryfikacji (quick action)",
                    });
                    if (error) throw error;
                    toast.success("Zadanie przekazane do weryfikacji");
                    queryClient.invalidateQueries({ queryKey: ["task"] });
                  } catch (err: any) {
                    toast.error("Błąd: " + (err.message || "Nie udało się zmienić statusu"));
                  }
                }}>
                <CheckCircle2 className="h-2.5 w-2.5" />Do weryfikacji
              </Button>
            )}
            {!isClient && !isPreviewMode && (task.status === "in_progress" || task.status === "todo") && !(task as any).is_misunderstood && (
              <Button variant="outline" size="sm" className="text-[10px] gap-1 h-6 border-amber-500/50 text-amber-600 hover:bg-amber-500/10" onClick={() => setNotUnderstoodOpen(true)}>
                <HelpCircle className="h-2.5 w-2.5" />Nie rozumiem
              </Button>
            )}
            {/* Right panel toggle for smaller screens */}
            <Button variant="outline" size="sm" className="text-[10px] gap-1 h-6 xl:hidden" onClick={() => setRightPanelOpen(true)}>
              <MessageCircle className="h-2.5 w-2.5" />Komentarze
            </Button>
          </div>
        </div>

        {/* ─── Three Column Layout ─── */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row">

          {/* ─── LEFT COLUMN ─── */}
          <div className="w-full md:w-[28%] xl:w-[25%] border-r border-border overflow-y-auto scrollbar-thin p-3 space-y-3 shrink-0">

            {/* Time tracking */}
            {!isPreviewMode && !isClient && (
              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="px-0 py-2">
                  <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />Czas pracy
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Łącznie</p>
                      <p className="text-base font-bold">{formatDuration(totalLogged)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Szacowany</p>
                      <p className="text-base font-bold">{task.estimated_time ? formatDuration(task.estimated_time) : "—"}</p>
                    </div>
                  </div>
                  {task.estimated_time > 0 && (
                    <Progress value={Math.min((totalLogged / task.estimated_time) * 100, 100)} className="h-1.5" />
                  )}
                  {/* Timer */}
                  <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                    <span className="text-sm font-mono font-bold">{formatTimer(timer.elapsed)}</span>
                    {!timer.isRunning ? (
                      <Button size="sm" variant="outline" onClick={() => timer.start()} className="gap-1 text-[10px] h-6">
                        <Play className="h-2.5 w-2.5" />Start
                      </Button>
                    ) : (
                      <Button size="sm" variant="destructive" onClick={stopTimer} className="gap-1 text-[10px] h-6">
                        <Timer className="h-2.5 w-2.5" />Stop
                      </Button>
                    )}
                  </div>
                  {/* Quick time buttons */}
                  <div className="flex flex-wrap gap-1">
                    {[5, 15, 30, 60, 120].map(m => (
                      <Button key={m} variant="outline" size="sm" className="text-[10px] h-6 px-2" onClick={() => logTime(m)}>
                        +{m >= 60 ? `${m / 60}h` : `${m}m`}
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <Input type="number" placeholder="Min..." value={manualMinutes}
                      onChange={e => setManualMinutes(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && logManualTime()}
                      className="text-xs h-7 w-20" min={1} />
                    <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={logManualTime}>
                      <Clock className="h-2.5 w-2.5 mr-1" />Zaloguj
                    </Button>
                  </div>
                  {/* Time log history */}
                  {timeLogs && timeLogs.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-border">
                      <p className="text-[10px] font-semibold text-muted-foreground">Historia</p>
                      {timeLogs.slice(0, 5).map((l: any) => (
                        <div key={l.id} className="flex items-center gap-1.5 text-[10px]">
                          <span className="font-medium truncate">{l.profiles?.full_name}</span>
                          <span className="text-muted-foreground">—</span>
                          <span className="font-semibold">{formatDuration(l.duration)}</span>
                          <span className="ml-auto text-muted-foreground">{new Date(l.created_at).toLocaleDateString("pl-PL")}</span>
                        </div>
                      ))}
                      {timeLogs.length > 5 && (
                        <p className="text-[10px] text-muted-foreground">+{timeLogs.length - 5} więcej</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Separator />

            {/* Checklists */}
            <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="px-0 py-2">
                <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />Lista kontrolna
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 space-y-3">
                {checklists && checklists.length > 0 && (
                  <div className="space-y-3">
                    {checklists.map((cl: any) => (
                      <div key={cl.id} className="space-y-1.5">
                        <p className="text-xs font-medium">{cl.title}</p>
                        {(cl.items || []).map((item: any) => (
                          <div key={item.id} className="flex items-center gap-1.5 pl-1">
                            <Checkbox checked={item.is_completed} disabled={item.is_na || isPreviewMode || isClient}
                              onCheckedChange={() => !isPreviewMode && !isClient && toggleChecklistItem(item.id, item.is_completed)}
                              className="h-3.5 w-3.5" />
                            <span className={cn("text-xs", item.is_completed && "line-through text-muted-foreground", item.is_na && "text-muted-foreground italic")}>
                              {item.title}
                            </span>
                            {item.is_na && <Badge variant="outline" className="text-[8px] h-3.5 px-1">N/A</Badge>}
                          </div>
                        ))}
                        {!isClient && !isPreviewMode && (
                          <div className="flex gap-1 pl-1">
                            <Input placeholder="Dodaj element..." value={newChecklistItemTexts[cl.id] || ""}
                              onChange={e => setNewChecklistItemTexts(prev => ({ ...prev, [cl.id]: e.target.value }))}
                              onKeyDown={e => e.key === "Enter" && addChecklistItem(cl.id)} className="text-xs h-6" />
                            <Button size="sm" variant="ghost" onClick={() => addChecklistItem(cl.id)} className="h-6 w-6 p-0"><Plus className="h-2.5 w-2.5" /></Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {(!checklists || checklists.length === 0) && (
                  <p className="text-xs text-muted-foreground">Brak list kontrolnych.</p>
                )}
                {!isClient && !isPreviewMode && (
                  <div className="flex gap-1.5">
                    <Input placeholder="Nazwa nowej listy..." value={newChecklistName}
                      onChange={e => setNewChecklistName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addChecklist()} className="text-xs h-7" />
                    <Button variant="outline" size="sm" className="text-[10px] gap-1 h-7" onClick={addChecklist}><Plus className="h-2.5 w-2.5" />Dodaj</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Separator />

            {/* Materials */}
            <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="px-0 py-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />Materiały
                    <span className="text-muted-foreground font-normal">
                      ({((isPreviewMode || isClient) ? materials?.filter((m: any) => m.is_visible_to_client) : materials)?.length || 0})
                    </span>
                  </CardTitle>
                  {!isPreviewMode && !isClient && (
                    <div className="flex gap-1">
                      <input ref={fileInputRef} type="file" className="hidden" onChange={e => { if (e.target.files?.[0]) uploadFile(e.target.files[0]); e.target.value = ""; }} />
                      <Button variant="ghost" size="sm" className="text-[10px] h-6 w-6 p-0" onClick={() => fileInputRef.current?.click()}><Upload className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="sm" className="text-[10px] h-6 w-6 p-0" onClick={() => setLinkDialogOpen(true)}><LinkIcon className="h-3 w-3" /></Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-0">
                {(() => {
                  const filteredMats = (isPreviewMode || isClient) ? (materials || []).filter((m: any) => m.is_visible_to_client) : (materials || []);
                  return filteredMats.length > 0 ? (
                    <div className="space-y-1.5">
                      {filteredMats.map((m: any) => (
                        <div key={m.id} className="flex items-center gap-1.5 p-1.5 rounded-md border bg-muted/30 group text-xs">
                          {m.type === "link" ? <LinkIcon className="h-3 w-3 text-blue-500 shrink-0" /> : <FileText className="h-3 w-3 text-muted-foreground shrink-0" />}
                          <div className="flex-1 min-w-0">
                            {m.url ? (
                              <a href={m.url} target="_blank" rel="noopener noreferrer" className="truncate block hover:underline text-primary text-xs">{m.name}</a>
                            ) : (
                              <span className="truncate block text-xs">{m.name}</span>
                            )}
                          </div>
                          {!isPreviewMode && !isClient && (
                            <label className="flex items-center gap-1 cursor-pointer shrink-0">
                              <Checkbox checked={!!m.is_visible_to_client} onCheckedChange={(checked) => toggleMaterialVisibility(m.id, !!checked)} className="h-3 w-3" />
                              <Eye className={cn("h-3 w-3", m.is_visible_to_client ? "text-emerald-600" : "text-muted-foreground/40")} />
                            </label>
                          )}
                          {!isPreviewMode && !isClient && (
                            <button onClick={() => deleteMaterial(m.id)}
                              className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Brak materiałów.</p>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Bug severity card */}
            {(task as any).bug_severity && (
              <>
                <Separator />
                <Card className="border-destructive">
                  <CardHeader className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <Bug className="h-3.5 w-3.5 text-destructive" />
                      <CardTitle className="text-xs font-semibold text-destructive">
                        {(task as any).bug_severity === "critical" ? "Poważny błąd" : "Zgłoszony błąd"}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="px-3 py-2 space-y-1">
                    {(task as any).bug_reason && <p className="text-xs"><span className="font-medium text-destructive">Powód: </span>{(task as any).bug_reason}</p>}
                    {(task as any).bug_description && <p className="text-xs text-muted-foreground">{(task as any).bug_description}</p>}
                  </CardContent>
                </Card>
              </>
            )}

            {/* Client Review Actions */}
            {isClient && task.status === "client_review" && (
              <>
                <Separator />
                <Card className="border-2 border-primary/30 bg-primary/5">
                  <CardHeader className="px-3 py-2">
                    <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />Akcja wymagana
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 py-2 space-y-3">
                    {!clientReviewOpen ? (
                      <div className="flex gap-2">
                        <Button onClick={handleClientAccept} size="sm" className="flex-1 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                          <CheckCircle2 className="h-3 w-3" />Akceptuję
                        </Button>
                        <Button onClick={() => setClientReviewOpen(true)} variant="destructive" size="sm" className="flex-1 gap-1.5 text-xs">
                          <AlertTriangle className="h-3 w-3" />Do poprawy
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-1.5">
                          <Button variant={correctionSeverity === "normal" ? "default" : "outline"} size="sm" onClick={() => setCorrectionSeverity("normal")} className="flex-1 text-[10px]">Drobne</Button>
                          <Button variant={correctionSeverity === "critical" ? "destructive" : "outline"} size="sm" onClick={() => setCorrectionSeverity("critical")} className="flex-1 text-[10px]">🔴 Krytyczne</Button>
                        </div>
                        <Textarea value={correctionText} onChange={e => setCorrectionText(e.target.value)} placeholder="Co wymaga poprawy?" className="min-h-[60px] text-xs" />
                        <div className="flex gap-1.5">
                          <Button variant="outline" size="sm" onClick={() => { setClientReviewOpen(false); setCorrectionText(""); }} className="flex-1 text-xs">Anuluj</Button>
                          <Button variant="destructive" size="sm" onClick={handleClientReject} disabled={!correctionText.trim()} className="flex-1 text-xs">Wyślij</Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* ─── CENTER COLUMN ─── */}
          <div className="flex-1 min-w-0 overflow-y-auto scrollbar-thin p-4">
            <Tabs defaultValue="description" className="space-y-3">
              <TabsList className="h-8">
                <TabsTrigger value="description" className="text-xs h-7 px-3">Opis</TabsTrigger>
                <TabsTrigger value="brief" className="text-xs h-7 px-3 relative">
                  Brief
                  {briefFilledCount === 0 && !isClient && (
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive" />
                  )}
                </TabsTrigger>
                {!isPreviewMode && !isClient && (
                  <TabsTrigger value="history" className="text-xs h-7 px-3">
                    <History className="h-3 w-3 mr-1" />Historia statusów
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Tab: Description */}
              <TabsContent value="description" className="mt-3">
                <DescriptionCard
                  description={task.description}
                  taskId={task.id}
                  canEdit={canEditInline}
                  onSaved={() => queryClient.invalidateQueries({ queryKey: ["task", id] })}
                />

                {/* Corrections history */}
                {corrections && corrections.length > 0 && (
                  <Card className="mt-3">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Bug className="h-4 w-4 text-orange-500" />
                        Poprawki ({corrections.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {corrections.map((c: any) => (
                        <div key={c.id} className={cn(
                          "rounded-lg border p-2.5 space-y-1",
                          c.severity === "critical" ? "border-destructive/40 bg-destructive/5" : "border-amber-400/40 bg-amber-500/5"
                        )}>
                          <div className="flex items-center gap-1.5">
                            <Badge className={cn("text-[9px] font-bold", c.severity === "critical" ? "bg-destructive text-destructive-foreground" : "bg-amber-500/15 text-amber-700 border-amber-400/40")}>
                              {c.severity === "critical" ? "🔴 KRYTYCZNE" : "Drobne"}
                            </Badge>
                            <Badge variant="outline" className={cn("text-[9px]", c.status === "resolved" ? "bg-emerald-500/15 text-emerald-700" : "")}>
                              {c.status === "resolved" ? "Rozwiązane" : "Oczekujące"}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground ml-auto">{new Date(c.created_at).toLocaleString("pl-PL")}</span>
                          </div>
                          <p className="text-sm">{c.description}</p>
                          {c.profiles?.full_name && <p className="text-[10px] text-muted-foreground">Zgłoszone przez: {c.profiles.full_name}</p>}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Tab: Brief */}
              <TabsContent value="brief" className="mt-3">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">Brief zadania</CardTitle>
                      {!isClient && !isPreviewMode && (
                        <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={openBriefEditor}>
                          <Edit3 className="h-3 w-3" />Edytuj brief
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {!isClient && !isPreviewMode && (
                      <div className="flex items-center gap-3">
                        <Progress value={(briefFilledCount / briefFields.length) * 100} className="h-2 flex-1" />
                        <span className={cn("text-xs font-semibold", briefFilledCount === 0 ? "text-destructive" : briefFilledCount < briefFields.length ? "text-amber-600" : "text-green-600")}>
                          {briefFilledCount}/{briefFields.length} pól
                        </span>
                      </div>
                    )}
                    {!isClient && !isPreviewMode && briefFilledCount === 0 && (
                      <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Brief jest pusty! Uzupełnij go, aby zespół wiedział, co robić.
                      </div>
                    )}
                    {briefFilledCount > 0 && (
                      <div className="grid gap-2">
                        {briefFields.map(f => {
                          const val = (task as any)[f.key];
                          if (!val) return null;
                          return (
                            <div key={f.key}>
                              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">{f.label}</Label>
                              <p className="text-sm">{val}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Status History */}
              {!isPreviewMode && !isClient && (
                <TabsContent value="history" className="mt-3">
                  <StatusTimeline
                    statusHistory={statusHistory || []}
                    currentStatus={task?.status || "new"}
                    taskId={id}
                  />
                </TabsContent>
              )}
            </Tabs>
          </div>

          {/* ─── RIGHT COLUMN (Desktop xl+) ─── */}
          <div className="hidden xl:flex xl:w-[30%] border-l border-border flex-col">
            {commentsContent}
          </div>
        </div>
      </div>

      {/* Right panel Sheet for smaller screens */}
      <Sheet open={rightPanelOpen} onOpenChange={setRightPanelOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle className="flex items-center gap-2 text-sm">
              <MessageCircle className="h-4 w-4" />Komentarze i aktywność
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0">
            {commentsContent}
          </div>
        </SheetContent>
      </Sheet>

      {/* Brief Edit Dialog */}
      <Dialog open={briefOpen} onOpenChange={setBriefOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="px-1">
            <DialogTitle>Edytuj brief zadania</DialogTitle>
            <DialogDescription>Uzupełnij pola briefu, aby zespół wiedział, co i jak zrealizować.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 overflow-y-auto flex-1 px-1 py-1">
            {briefFields.map(f => (
              <div key={f.key} className="space-y-1">
                <Label className="text-sm">{f.label}</Label>
                <Textarea value={briefForm[f.key] || ""} onChange={e => setBriefForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={`Wpisz ${f.label.toLowerCase()}...`} className="min-h-[60px] text-sm w-full" />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBriefOpen(false)}>Anuluj</Button>
            <Button onClick={saveBrief}>Zapisz brief</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Dodaj link</DialogTitle>
            <DialogDescription>Podaj nazwę i adres URL materiału.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-sm">Nazwa</Label>
              <Input value={linkName} onChange={e => setLinkName(e.target.value)} placeholder="Nazwa materiału" className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">URL</Label>
              <Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." className="text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Anuluj</Button>
            <Button onClick={addLinkMaterial}>Dodaj link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Workflow Modals */}
      <NotUnderstoodModal
        open={notUnderstoodOpen}
        onOpenChange={setNotUnderstoodOpen}
        onConfirm={handleNotUnderstood}
      />
      <ChecklistBlockModal open={checklistBlockOpen} onOpenChange={setChecklistBlockOpen} />
      <VerificationSendModal
        open={verificationSendOpen}
        onOpenChange={setVerificationSendOpen}
        taskId={task.id}
        timeLogs={timeLogs || []}
        totalMinutes={totalLogged}
      />

      {/* Reject from review modal */}
      <RejectionModal
        open={rejectReviewOpen}
        onOpenChange={setRejectReviewOpen}
        onConfirm={handleRejectFromReview}
      />

      {/* Task Chat Sheet (kept for quick access) */}
      <Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />Czat zadania
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-3">
              {(!comments || comments.length === 0) ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Brak wiadomości. Rozpocznij rozmowę poniżej.</p>
              ) : (
                [...(comments || [])].reverse().map((c: any) => {
                  const isOwn = c.user_id === user?.id;
                  return (
                    <div key={c.id} className={cn("flex gap-2", isOwn && "flex-row-reverse")}>
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="text-xs bg-muted">
                          {(c.profiles?.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn("max-w-[75%] rounded-lg px-3 py-2", isOwn ? "bg-primary text-primary-foreground" : "bg-muted")}>
                        <p className="text-xs font-medium opacity-80">{c.profiles?.full_name || "Użytkownik"}</p>
                        <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                        <p className="text-[10px] opacity-60 mt-1">
                          {new Date(c.created_at).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
          <div className="border-t px-4 py-3 flex gap-2 items-end">
            <Textarea
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Napisz wiadomość..."
              className="min-h-[48px] max-h-[120px] resize-none text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && chatMessage.trim()) {
                  e.preventDefault();
                  (async () => {
                    if (!user) return;
                    const { error } = await supabase.from("comments").insert({ task_id: id!, user_id: user.id, content: chatMessage.trim(), type: "internal" });
                    if (error) { toast.error(error.message); return; }
                    setChatMessage("");
                    queryClient.invalidateQueries({ queryKey: ["comments", id] });
                  })();
                }
              }}
            />
            <Button
              size="icon"
              className="shrink-0"
              disabled={!chatMessage.trim()}
              onClick={async () => {
                if (!user || !chatMessage.trim()) return;
                const { error } = await supabase.from("comments").insert({ task_id: id!, user_id: user.id, content: chatMessage.trim(), type: "internal" });
                if (error) { toast.error(error.message); return; }
                setChatMessage("");
                queryClient.invalidateQueries({ queryKey: ["comments", id] });
              }}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

// Small inline component for client reply input
function ClientReplyInput({ commentId, taskId }: { commentId: string; taskId: string }) {
  const [reply, setReply] = useState("");
  const queryClient = useQueryClient();

  async function submitReply() {
    if (!reply.trim()) return;
    const { error } = await supabase.from("comments").update({ client_reply: reply } as any).eq("id", commentId);
    if (error) { toast.error("Błąd wysyłania odpowiedzi"); return; }
    queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
    setReply("");
    toast.success("Odpowiedź wysłana");
  }

  return (
    <div className="mt-2 flex gap-2">
      <Textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Napisz odpowiedź..." className="min-h-[40px] text-sm" />
      <Button size="sm" onClick={submitReply} disabled={!reply.trim()} className="self-end"><Send className="h-3 w-3" /></Button>
    </div>
  );
}

// Misunderstood task banner with reporter name
function MisunderstoodBanner({ task, onResolve }: { task: any; onResolve: () => void }) {
  const { data: reporter } = useQuery({
    queryKey: ["misunderstood-reporter", task.misunderstood_by],
    queryFn: async () => {
      if (!task.misunderstood_by) return null;
      const { data } = await supabase.from("profiles").select("full_name").eq("id", task.misunderstood_by).single();
      return data;
    },
    enabled: !!task.misunderstood_by,
  });

  const reporterName = reporter?.full_name || "Pracownik";

  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
      <div className="flex items-start gap-2">
        <HelpCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
            {reporterName} zgłosił niezrozumienie zadania
          </p>
          {task.misunderstood_reason && <p className="text-xs text-muted-foreground mt-0.5">„{task.misunderstood_reason}"</p>}
        </div>
      </div>
      <Button variant="outline" size="sm" className="text-[10px] shrink-0 h-6" onClick={onResolve}>
        Wyjaśnione
      </Button>
    </div>
  );
}
