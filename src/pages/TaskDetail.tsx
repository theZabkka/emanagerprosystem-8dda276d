import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ChevronRight, Send, ShieldCheck, MessageCircle, AlertTriangle, Eye, Zap,
  FileText, CheckCircle2, HelpCircle, ArrowLeft, UserPlus, Edit3, Lock, X,
} from "lucide-react";
import { NotUnderstoodModal, ChecklistBlockModal } from "@/components/tasks/WorkflowModals";
import { VerificationSendModal } from "@/components/tasks/VerificationSendModal";
import { RejectionModal } from "@/components/tasks/RejectionModal";
import { useRole } from "@/hooks/useRole";
import { statusLabels, statusColors, TERMINAL_STATUSES } from "@/lib/statusConfig";
import { useTimerStore } from "@/hooks/useTimerStore";
import { useVerificationLock } from "@/hooks/useVerificationLock";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

import { TaskLeftPanel } from "@/components/tasks/detail/TaskLeftPanel";
import { TaskCenterTabs } from "@/components/tasks/detail/TaskCenterTabs";
import { TaskRightPanel } from "@/components/tasks/detail/TaskRightPanel";

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isClient, currentRole } = useRole();
  const queryClient = useQueryClient();
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [notUnderstoodOpen, setNotUnderstoodOpen] = useState(false);
  const [checklistBlockOpen, setChecklistBlockOpen] = useState(false);
  const [verificationSendOpen, setVerificationSendOpen] = useState(false);
  const [rejectReviewOpen, setRejectReviewOpen] = useState(false);
  const [clientReviewOpen, setClientReviewOpen] = useState(false);
  const [correctionSeverity, setCorrectionSeverity] = useState<"normal" | "critical">("normal");
  const [correctionText, setCorrectionText] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { refreshAfterVerification } = useVerificationLock();

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
      const { data } = await supabase.from("task_corrections").select("*, profiles:created_by(full_name)").eq("task_id", id!).order("created_at", { ascending: false });
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
  const totalLogged = timeLogs?.reduce((sum: number, l: any) => sum + l.duration, 0) || 0;
  const isOverdue = task?.due_date && new Date(task.due_date) < new Date() && task.status !== "done" && task.status !== "cancelled";
  const hasNoAssignment = !assignments || assignments.length === 0;
  const canEditInline = !isClient && !isPreviewMode;

  // ─── Actions ─────────────────────────────────────────────────────
  async function handleStatusChange(newStatus: string) {
    if (!task || newStatus === task.status) return;
    if ((assignments || []).length === 0) { toast.error("Przypisz najpierw osobę do zadania."); return; }
    if (task.status === "in_progress" && newStatus === "review") {
      const allComplete = checklists?.every((cl: any) => (cl.items || []).length === 0 || (cl.items || []).every((i: any) => i.is_completed || i.is_na)) ?? true;
      if (!allComplete) { setChecklistBlockOpen(true); return; }
    }
    if (newStatus === "client_review" && task.status !== "review" && task.status !== "corrections") {
      toast.error("Zadanie może trafić do akceptacji klienta tylko ze statusu Weryfikacja lub Poprawki"); return;
    }
    if ((task.status === "review" || task.status === "corrections") && newStatus === "client_review") {
      if (totalLogged <= 0) { toast.error("Brak zalogowanego czasu."); return; }
      setVerificationSendOpen(true); return;
    }
    await executeStatusChange(newStatus);
  }

  async function executeStatusChange(newStatus: string) {
    if (!task) return;
    if ((newStatus === "closed" || newStatus === "cancelled" || newStatus === "done") && timer.isRunning) {
      const totalSecs = timer.stop();
      if (totalSecs >= 60) await logTime(Math.round(totalSecs / 60));
    }
    const { error } = await supabase.rpc("change_task_status", { _task_id: task.id, _new_status: newStatus as any, _changed_by: user?.id! });
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["task", id] });
    queryClient.invalidateQueries({ queryKey: ["status-history", id] });
    refreshAfterVerification();
    toast.success(`Status zmieniony na ${statusLabels[newStatus]}`);
  }

  async function handleNotUnderstood(reason: string) {
    if (!task || !user) return;
    await supabase.from("tasks").update({ not_understood: true, not_understood_at: new Date().toISOString(), is_misunderstood: true, misunderstood_by: user.id, misunderstood_reason: reason || null } as any).eq("id", task.id);
    await supabase.from("activity_log").insert({ user_id: user.id, action: "misunderstood_reported", entity_type: "task", entity_id: task.id, entity_name: task.title, details: { reason: reason || null } });
    if (reason.trim()) {
      await supabase.from("comments").insert({ task_id: task.id, user_id: user.id, content: `❓ Nie rozumiem polecenia: ${reason}`, type: "internal" });
    }
    queryClient.invalidateQueries({ queryKey: ["task", id] });
    queryClient.invalidateQueries({ queryKey: ["comments", id] });
    toast.success("Zgłoszono niezrozumienie zadania");
  }

  async function clearNotUnderstood() {
    if (!task || !user) return;
    await supabase.from("tasks").update({ not_understood: false, not_understood_at: null, is_misunderstood: false, misunderstood_by: null, misunderstood_reason: null } as any).eq("id", task.id);
    await supabase.from("activity_log").insert({ user_id: user.id, action: "misunderstood_resolved", entity_type: "task", entity_id: task.id, entity_name: task.title });
    queryClient.invalidateQueries({ queryKey: ["task", id] });
    toast.success("Oznaczono jako wyjaśnione");
  }

  async function handleClientAccept() {
    if (!task) return;
    const { error } = await supabase.rpc("change_task_status", { _task_id: task.id, _new_status: "client_verified" as any, _changed_by: user?.id! });
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["task", id] });
    refreshAfterVerification();
    toast.success("Zadanie zaakceptowane!");
  }

  async function handleClientReject() {
    if (!task || !correctionText.trim()) { toast.error("Opisz co wymaga poprawki"); return; }
    await supabase.from("task_corrections").insert({ task_id: task.id, created_by: user?.id, severity: correctionSeverity, description: correctionText });
    await supabase.from("tasks").update({ correction_severity: correctionSeverity } as any).eq("id", task.id);
    const { error } = await supabase.rpc("change_task_status", { _task_id: task.id, _new_status: "corrections" as any, _changed_by: user?.id! });
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["task", id] });
    queryClient.invalidateQueries({ queryKey: ["task-corrections", id] });
    refreshAfterVerification();
    setClientReviewOpen(false); setCorrectionText(""); setCorrectionSeverity("normal");
    toast.success("Poprawki zgłoszone");
  }

  async function handleRejectFromReview(category: string, comment: string) {
    if (!task || !user?.id) return;
    const primaryAssign = (assignments || []).find((a: any) => a.role === "primary");
    await supabase.from("task_rejections").insert({ task_id: task.id, project_id: task.project_id || null, rejected_by: user.id, assigned_to: primaryAssign?.user_id || null, reason_category: category, comment: comment || null } as any);
    const commentContent = `🔴 Odrzucono: [${category}]${comment ? ` — ${comment}` : ""}`;
    await supabase.from("comments").insert({ task_id: task.id, user_id: user.id, content: commentContent, type: "internal" });
    const { error } = await supabase.rpc("change_task_status", { _task_id: task.id, _new_status: "corrections" as any, _changed_by: user.id, _note: commentContent });
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["task", id] });
    queryClient.invalidateQueries({ queryKey: ["comments", id] });
    queryClient.invalidateQueries({ queryKey: ["status-history", id] });
    refreshAfterVerification();
    setRejectReviewOpen(false);
    toast.success("Zadanie odrzucone — przeniesiono do POPRAWEK");
  }

  async function logTime(minutes: number) {
    if (minutes <= 0 || !user) return;
    const { error } = await supabase.from("time_logs").insert({ task_id: id!, user_id: user.id, duration: minutes });
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["time-logs", id] });
    toast.success(`Zalogowano ${minutes} min`);
  }

  async function stopTimer() {
    const totalSecs = timer.stop();
    if (totalSecs < 60) return;
    await logTime(Math.round(totalSecs / 60));
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
  }

  async function handlePriorityChange(p: string) {
    if (!task || p === task.priority) return;
    const { error } = await supabase.from("tasks").update({ priority: p as any, updated_at: new Date().toISOString() } as any).eq("id", task.id);
    if (error) { toast.error("Błąd"); return; }
    queryClient.invalidateQueries({ queryKey: ["task", id] });
  }

  async function handleDeadlineChange(d: Date | undefined) {
    if (!task) return;
    const { error } = await supabase.from("tasks").update({
      due_date: d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null,
      updated_at: new Date().toISOString(),
    } as any).eq("id", task.id);
    if (error) { toast.error("Błąd"); return; }
    queryClient.invalidateQueries({ queryKey: ["task", id] });
  }

  async function handleClientChange(newClientId: string | null) {
    if (!task) return;
    const { error } = await supabase.from("tasks").update({ client_id: newClientId, updated_at: new Date().toISOString() } as any).eq("id", task.id);
    if (error) { toast.error("Błąd"); return; }
    queryClient.invalidateQueries({ queryKey: ["task", id] });
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
  }, [task, titleValue, isSavingTitle, queryClient, id]);

  if (isLoading) return <AppLayout title="Zadanie"><div className="p-8 text-muted-foreground">Ładowanie...</div></AppLayout>;
  if (!task) return <AppLayout title="Zadanie"><div className="p-8 text-muted-foreground">Nie znaleziono zadania.</div></AppLayout>;

  const showAssignOverlay = hasNoAssignment && !isClient && !isPreviewMode;

  return (
    <AppLayout title={task.title}>
      <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
        {/* ─── Top Bar ─── */}
        <div className="shrink-0 border-b bg-background px-4 py-2 space-y-2">
          {/* Preview banner */}
          {isPreviewMode && (
            <div className="flex items-center justify-between gap-4 bg-orange-500 text-white rounded-lg px-4 py-2 text-sm">
              <div className="flex items-center gap-2"><Eye className="h-4 w-4" /><span className="font-semibold">Tryb podglądu klienta</span></div>
              <Button size="sm" className="bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs h-7" onClick={() => setIsPreviewMode(false)}>Wyjdź</Button>
            </div>
          )}

          {/* Unassigned overlay */}
          {showAssignOverlay && (
            <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-2.5">
              <UserPlus className="h-5 w-5 text-destructive shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-destructive">Zadanie nie ma przypisanej osoby!</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(allProfiles || []).map((p: any) => (
                    <button key={p.id} onClick={() => addAssignment(p.id, "primary")}
                      className="flex items-center gap-1 px-2 py-1 text-xs border rounded-full hover:bg-accent transition-colors bg-background">
                      <Avatar className="h-4 w-4"><AvatarFallback className="text-[7px] bg-primary/10 text-primary font-bold">{p.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
                      {p.full_name}
                    </button>
                  ))}
                </div>
              </div>
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
                <Link to="/tasks" className="hover:text-foreground hover:underline flex items-center gap-1"><ArrowLeft className="h-3 w-3" />Zadania</Link>
                {task.client_id && task.clients?.name && (
                  <><ChevronRight className="h-3 w-3" /><Link to={`/clients/${task.client_id}`} className="hover:text-foreground hover:underline truncate max-w-[150px]">{task.clients.name}</Link></>
                )}
                <ChevronRight className="h-3 w-3" />
              </>
            )}
          </div>

          {/* Title + Actions row */}
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              {canEditInline && isEditingTitle ? (
                <Input ref={titleInputRef} autoFocus value={titleValue} onChange={(e) => setTitleValue(e.target.value)} disabled={isSavingTitle}
                  className="text-lg font-bold h-auto py-1 px-2" onBlur={saveTitle}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveTitle(); } if (e.key === "Escape") { setIsEditingTitle(false); } }} />
              ) : (
                <div className={cn("group flex items-center gap-2", canEditInline && "cursor-pointer")}
                  onClick={() => { if (!canEditInline) return; setTitleValue(task.title); setIsEditingTitle(true); }}>
                  <h1 className="text-lg font-bold truncate">{task.title}</h1>
                  {canEditInline && <Edit3 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                </div>
              )}
              {task.clients?.name && <p className="text-xs text-muted-foreground mt-0.5">{task.clients.name}{task.projects?.name && ` • ${task.projects.name}`}</p>}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {!isClient && !isPreviewMode && (task.status === "review" || task.status === "corrections") && (
                <Button size="sm" className="text-xs gap-1 h-7 bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={() => {
                    if (totalLogged <= 0) { toast.error("Brak zalogowanego czasu."); return; }
                    setVerificationSendOpen(true);
                  }}>
                  <ShieldCheck className="h-3 w-3" />Do akceptacji
                </Button>
              )}
              {!isClient && !isPreviewMode && task.status === "review" && (
                <Button variant="destructive" size="sm" className="text-xs gap-1 h-7" onClick={() => setRejectReviewOpen(true)}>
                  <AlertTriangle className="h-3 w-3" />Odrzuć
                </Button>
              )}
              {!isClient && !isPreviewMode && (
                <Button variant="outline" size="sm" className="text-xs gap-1 h-7" onClick={() => setIsPreviewMode(true)}><Eye className="h-3 w-3" />Podgląd</Button>
              )}
              {!isClient && !isPreviewMode && !["review", "client_review", "client_verified", "done", "closed", "cancelled"].includes(task.status || "") && (
                <Button variant="outline" size="sm" className="text-xs gap-1 h-7 border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10"
                  onClick={async () => {
                    try {
                      const { error } = await supabase.rpc("change_task_status", { _task_id: task.id, _new_status: "review", _changed_by: user?.id, _note: "Przekazano do weryfikacji" });
                      if (error) throw error;
                      toast.success("Przekazane do weryfikacji");
                      queryClient.invalidateQueries({ queryKey: ["task"] });
                    } catch (err: any) { toast.error(err.message); }
                  }}>
                  <CheckCircle2 className="h-3 w-3" />Do weryfikacji
                </Button>
              )}
              {!isClient && !isPreviewMode && (task.status === "in_progress" || task.status === "todo") && !(task as any).is_misunderstood && (
                <Button variant="outline" size="sm" className="text-xs gap-1 h-7 border-amber-500/50 text-amber-600 hover:bg-amber-500/10" onClick={() => setNotUnderstoodOpen(true)}>
                  <HelpCircle className="h-3 w-3" />Nie rozumiem
                </Button>
              )}
              {!isClient && !isPreviewMode && (
                <Button variant="outline" size="sm" className="text-xs gap-1 h-7 border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => setIsChatOpen(true)}>
                  <MessageCircle className="h-3 w-3" />Czat
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ─── 3-Column Layout ─── */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          {/* Left Column - Metadata */}
          <div className="w-full lg:w-[22%] lg:min-w-[220px] lg:max-w-[280px] border-b lg:border-b-0 lg:border-r overflow-y-auto p-3 shrink-0">
            <TaskLeftPanel
              task={task}
              assignments={assignments || []}
              allProfiles={allProfiles || []}
              allClients={allClients || []}
              canEditInline={canEditInline}
              isClient={isClient}
              isPreviewMode={isPreviewMode}
              isOverdue={!!isOverdue}
              onPriorityChange={handlePriorityChange}
              onDeadlineChange={handleDeadlineChange}
              onClientChange={handleClientChange}
              onStatusChange={handleStatusChange}
              onAddAssignment={addAssignment}
              onRemoveAssignment={removeAssignment}
            />
          </div>

          {/* Center Column - Tabs */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden border-b lg:border-b-0 lg:border-r">
            <TaskCenterTabs
              task={task}
              taskId={id!}
              checklists={checklists || []}
              materials={materials || []}
              timeLogs={timeLogs || []}
              statusHistory={statusHistory || []}
              corrections={corrections || []}
              totalLogged={totalLogged}
              canEditInline={canEditInline}
              isClient={isClient}
              isPreviewMode={isPreviewMode}
              timer={timer}
              user={user}
              onLogTime={logTime}
              onStopTimer={stopTimer}
            />
          </div>

          {/* Right Column - Communication */}
          <div className="w-full lg:w-[30%] lg:min-w-[300px] lg:max-w-[400px] flex flex-col overflow-hidden">
            <TaskRightPanel
              taskId={id!}
              comments={comments || []}
              statusHistory={statusHistory || []}
              isClient={isClient}
              isPreviewMode={isPreviewMode}
              user={user}
            />

            {/* Client review actions */}
            {isClient && task.status === "client_review" && (
              <div className="border-t p-3 shrink-0 bg-primary/5">
                {!clientReviewOpen ? (
                  <div className="flex gap-2">
                    <Button onClick={handleClientAccept} className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                      <CheckCircle2 className="h-3 w-3" />Akceptuję
                    </Button>
                    <Button onClick={() => setClientReviewOpen(true)} variant="destructive" className="flex-1 gap-1.5 text-xs">
                      <AlertTriangle className="h-3 w-3" />Do poprawy
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button variant={correctionSeverity === "normal" ? "default" : "outline"} size="sm" onClick={() => setCorrectionSeverity("normal")} className="flex-1 text-xs">Drobne</Button>
                      <Button variant={correctionSeverity === "critical" ? "destructive" : "outline"} size="sm" onClick={() => setCorrectionSeverity("critical")} className="flex-1 text-xs">🔴 Krytyczne</Button>
                    </div>
                    <Textarea value={correctionText} onChange={e => setCorrectionText(e.target.value)} placeholder="Opisz co wymaga poprawy..." className="min-h-[60px] text-sm" />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setClientReviewOpen(false); setCorrectionText(""); }} className="flex-1 text-xs">Anuluj</Button>
                      <Button variant="destructive" size="sm" onClick={handleClientReject} disabled={!correctionText.trim()} className="flex-1 text-xs">Wyślij poprawki</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <NotUnderstoodModal open={notUnderstoodOpen} onOpenChange={setNotUnderstoodOpen} onConfirm={handleNotUnderstood} />
      <ChecklistBlockModal open={checklistBlockOpen} onOpenChange={setChecklistBlockOpen} />
      <VerificationSendModal open={verificationSendOpen} onOpenChange={setVerificationSendOpen} taskId={task.id} timeLogs={timeLogs || []} totalMinutes={totalLogged} />
      <RejectionModal open={rejectReviewOpen} onOpenChange={setRejectReviewOpen} onConfirm={handleRejectFromReview} />

      {/* Task Chat Sheet */}
      <Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle className="flex items-center gap-2"><MessageCircle className="h-4 w-4" />Czat zadania</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-3">
              {(!comments || comments.length === 0) ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Brak wiadomości.</p>
              ) : (
                [...(comments || [])].reverse().map((c: any) => {
                  const isOwn = c.user_id === user?.id;
                  return (
                    <div key={c.id} className={cn("flex gap-2", isOwn && "flex-row-reverse")}>
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="text-xs bg-muted">{(c.profiles?.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className={cn("max-w-[75%] rounded-lg px-3 py-2", isOwn ? "bg-primary text-primary-foreground" : "bg-muted")}>
                        <p className="text-xs font-medium opacity-80">{c.profiles?.full_name || "?"}</p>
                        <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                        <p className="text-[10px] opacity-60 mt-1">{new Date(c.created_at).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
          <div className="border-t px-4 py-3 flex gap-2 items-end">
            <Textarea value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} placeholder="Napisz wiadomość..." className="min-h-[48px] max-h-[120px] resize-none text-sm"
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
              }} />
            <Button size="icon" className="shrink-0" disabled={!chatMessage.trim()}
              onClick={async () => {
                if (!user || !chatMessage.trim()) return;
                const { error } = await supabase.from("comments").insert({ task_id: id!, user_id: user.id, content: chatMessage.trim(), type: "internal" });
                if (error) { toast.error(error.message); return; }
                setChatMessage("");
                queryClient.invalidateQueries({ queryKey: ["comments", id] });
              }}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

// Misunderstood banner
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

  return (
    <div className="flex items-start justify-between gap-3 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
      <div className="flex items-start gap-2">
        <HelpCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">{reporter?.full_name || "Pracownik"} zgłosił niezrozumienie</p>
          {task.misunderstood_reason && <p className="text-xs text-muted-foreground mt-0.5">„{task.misunderstood_reason}"</p>}
        </div>
      </div>
      <Button variant="outline" size="sm" className="text-xs shrink-0 h-7" onClick={onResolve}>Wyjaśnione</Button>
    </div>
  );
}
