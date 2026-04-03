import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { useRole } from "@/hooks/useRole";
import { useTimerStore } from "@/hooks/useTimerStore";
import { useVerificationLock } from "@/hooks/useVerificationLock";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { statusLabels, statusColors } from "@/lib/statusConfig";
import { ArrowLeft, ChevronRight, Eye, MessageSquare, UserPlus } from "lucide-react";
import { NotUnderstoodModal, ChecklistBlockModal } from "@/components/tasks/WorkflowModals";
import { VerificationSendModal } from "@/components/tasks/VerificationSendModal";
import { RejectionModal } from "@/components/tasks/RejectionModal";
import { LeftPanel } from "@/components/tasks/detail/LeftPanel";
import { MiddleTabs } from "@/components/tasks/detail/MiddleTabs";
import { CommPanel } from "@/components/tasks/detail/CommPanel";

const briefFields = [
  { key: "brief_goal", label: "Cel zadania" },
  { key: "brief_deliverable", label: "Co dostarczyć" },
  { key: "brief_format", label: "Format dostarczenia" },
  { key: "brief_input_materials", label: "Materiały wejściowe" },
  { key: "brief_dont_do", label: "Czego NIE robić" },
  { key: "brief_inspiration", label: "Wzorzec / inspiracja" },
];

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isClient, currentRole } = useRole();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // ─── State ───
  const [commentText, setCommentText] = useState("");
  const [commentType, setCommentType] = useState("internal");
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
  const [clientReviewOpen, setClientReviewOpen] = useState(false);
  const [correctionSeverity, setCorrectionSeverity] = useState<"normal" | "critical">("normal");
  const [correctionText, setCorrectionText] = useState("");
  const [rejectReviewOpen, setRejectReviewOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [commSheetOpen, setCommSheetOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { refreshAfterVerification } = useVerificationLock();

  // ─── Queries ───
  const { data: task, isLoading } = useQuery({
    queryKey: ["task", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, clients(name), projects(name), task_assignments(*, profiles:user_id(full_name, avatar_url))")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: allClients } = useQuery({
    queryKey: ["all-clients-picker"],
    staleTime: 30 * 60 * 1000, // 30 minut
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").order("name");
      return data || [];
    },
  });

  const assignments = task?.task_assignments || [];

  const { data: allProfiles } = useStaffMembers();

  const { data: comments } = useQuery({
    queryKey: ["comments", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("comments")
        .select("*, profiles:user_id(full_name, role)")
        .eq("task_id", id!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: timeLogs } = useQuery({
    queryKey: ["time-logs", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("time_logs")
        .select("*, profiles:user_id(full_name)")
        .eq("task_id", id!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: checklists } = useQuery({
    queryKey: ["checklists", id],
    queryFn: async () => {
      const { data: cls } = await supabase
        .from("checklists")
        .select("*, checklist_items(*)")
        .eq("task_id", id!)
        .order("created_at");
      return (cls || []).map((cl: any) => ({ ...cl, items: cl.checklist_items || [] }));
    },
    enabled: !!id,
  });

  const { data: materials } = useQuery({
    queryKey: ["materials", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("task_materials")
        .select("*, profiles:uploaded_by(full_name)")
        .eq("task_id", id!)
        .order("created_at");
      return data || [];
    },
    enabled: !!id,
  });

  const { data: statusHistory } = useQuery({
    queryKey: ["status-history", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("task_status_history")
        .select("*, profiles:changed_by(full_name)")
        .eq("task_id", id!)
        .order("created_at", { ascending: false });
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

  // ─── Real-time ───
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`task-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `task_id=eq.${id}` }, () =>
        queryClient.invalidateQueries({ queryKey: ["comments", id] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "time_logs", filter: `task_id=eq.${id}` }, () =>
        queryClient.invalidateQueries({ queryKey: ["time-logs", id] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_status_history", filter: `task_id=eq.${id}` },
        () => queryClient.invalidateQueries({ queryKey: ["status-history", id] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_assignments", filter: `task_id=eq.${id}` },
        () => queryClient.invalidateQueries({ queryKey: ["task-assignments", id] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "checklists", filter: `task_id=eq.${id}` }, () =>
        queryClient.invalidateQueries({ queryKey: ["checklists", id] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_materials", filter: `task_id=eq.${id}` },
        () => queryClient.invalidateQueries({ queryKey: ["materials", id] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_corrections", filter: `task_id=eq.${id}` },
        () => queryClient.invalidateQueries({ queryKey: ["task-corrections", id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  const timer = useTimerStore(id);

  // ─── Computed ───
  const totalLogged = timeLogs?.reduce((sum: number, l: any) => sum + l.duration, 0) || 0;
  const isOverdue =
    task?.due_date && new Date(task.due_date) < new Date() && task.status !== "done" && task.status !== "cancelled";
  const hasNoAssignment = !assignments || assignments.length === 0;
  const canEditInline = !isClient && !isPreviewMode;
  const briefFilledCount = useMemo(() => {
    if (!task) return 0;
    return briefFields.filter((f) => (task as any)[f.key]).length;
  }, [task]);
  const unassignedProfiles = useMemo(() => {
    if (!allProfiles || !assignments) return [];
    const assignedIds = new Set(assignments.map((a: any) => a.user_id));
    return allProfiles.filter((p: any) => !assignedIds.has(p.id));
  }, [allProfiles, assignments]);

  // ─── Actions ───
  async function handleStatusChange(newStatus: string) {
    if (!task || newStatus === task.status) return;
    if ((assignments || []).length === 0) {
      toast.error("Przypisz najpierw osobę do tego zadania.");
      return;
    }
    if (task.status === "in_progress" && newStatus === "review") {
      const allComplete =
        checklists?.every(
          (cl: any) => (cl.items || []).length === 0 || (cl.items || []).every((i: any) => i.is_completed || i.is_na),
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
      if (totalSecs >= 60) await logTime(Math.round(totalSecs / 60));
    }
    const { error } = await supabase.rpc("change_task_status", {
      _task_id: task.id,
      _new_status: newStatus as any,
      _changed_by: user?.id!,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["task", id] });
    queryClient.invalidateQueries({ queryKey: ["status-history", id] });
    refreshAfterVerification();
    toast.success(`Status zmieniony na ${statusLabels[newStatus]}`);
  }

  async function handleNotUnderstood(reason: string) {
    if (!task || !user) return;
    await supabase
      .from("tasks")
      .update({
        not_understood: true,
        not_understood_at: new Date().toISOString(),
        is_misunderstood: true,
        misunderstood_by: user.id,
        misunderstood_reason: reason || null,
      } as any)
      .eq("id", task.id);
    await supabase
      .from("activity_log")
      .insert({
        user_id: user.id,
        action: "misunderstood_reported",
        entity_type: "task",
        entity_id: task.id,
        entity_name: task.title,
        details: { reason: reason || null },
      });
    if (reason.trim())
      await supabase
        .from("comments")
        .insert({
          task_id: task.id,
          user_id: user.id,
          content: `❓ Nie rozumiem polecenia: ${reason}`,
          type: "internal",
        });
    queryClient.invalidateQueries({ queryKey: ["task", id] });
    queryClient.invalidateQueries({ queryKey: ["comments", id] });
    toast.success("Zgłoszono niezrozumienie zadania");
  }

  async function clearNotUnderstood() {
    if (!task || !user) return;
    await supabase
      .from("tasks")
      .update({
        not_understood: false,
        not_understood_at: null,
        is_misunderstood: false,
        misunderstood_by: null,
        misunderstood_reason: null,
      } as any)
      .eq("id", task.id);
    await supabase
      .from("activity_log")
      .insert({
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
      _task_id: task.id,
      _new_status: "client_verified" as any,
      _changed_by: user?.id!,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["task", id] });
    queryClient.invalidateQueries({ queryKey: ["status-history", id] });
    refreshAfterVerification();
    toast.success("Zadanie zaakceptowane!");
  }

  async function handleClientReject() {
    if (!task || !correctionText.trim()) {
      toast.error("Opisz co wymaga poprawki");
      return;
    }
    await supabase
      .from("task_corrections")
      .insert({ task_id: task.id, created_by: user?.id, severity: correctionSeverity, description: correctionText });
    await supabase
      .from("tasks")
      .update({ correction_severity: correctionSeverity } as any)
      .eq("id", task.id);
    const { error } = await supabase.rpc("change_task_status", {
      _task_id: task.id,
      _new_status: "corrections" as any,
      _changed_by: user?.id!,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
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
    await supabase
      .from("task_rejections")
      .insert({
        task_id: task.id,
        project_id: task.project_id || null,
        rejected_by: user.id,
        assigned_to: primaryAssign?.user_id || null,
        reason_category: category,
        comment: comment || null,
      } as any);
    const commentContent = `🔴 Odrzucono: [${category}]${comment ? ` — ${comment}` : ""}`;
    await supabase
      .from("comments")
      .insert({ task_id: task.id, user_id: user.id, content: commentContent, type: "internal" });
    const { error } = await supabase.rpc("change_task_status", {
      _task_id: task.id,
      _new_status: "corrections" as any,
      _changed_by: user.id,
      _note: commentContent,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
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
    briefFields.forEach((f) => {
      form[f.key] = (task as any)[f.key] || "";
    });
    setBriefForm(form);
    setBriefOpen(true);
  }

  async function saveBrief() {
    if (!task) return;
    const { error } = await supabase
      .from("tasks")
      .update(briefForm as any)
      .eq("id", task.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["task", id] });
    setBriefOpen(false);
    toast.success("Brief zapisany");
  }

  async function addAssignment(userId: string, role: string = "collaborator") {
    const { error } = await supabase
      .from("task_assignments")
      .insert({ task_id: id!, user_id: userId, role: role as any });
    if (error) {
      toast.error(error.message);
      return;
    }
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
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewChecklistName("");
    queryClient.invalidateQueries({ queryKey: ["checklists", id] });
  }

  async function addChecklistItem(checklistId: string) {
    const text = newChecklistItemTexts[checklistId]?.trim();
    if (!text) return;
    await supabase.from("checklist_items").insert({ checklist_id: checklistId, title: text });
    queryClient.invalidateQueries({ queryKey: ["checklists", id] });
    setNewChecklistItemTexts((prev) => ({ ...prev, [checklistId]: "" }));
  }

  async function toggleChecklistItem(itemId: string, completed: boolean) {
    await supabase.from("checklist_items").update({ is_completed: !completed }).eq("id", itemId);
    queryClient.invalidateQueries({ queryKey: ["checklists", id] });
  }

  async function uploadFile(file: File) {
    if (!user) return;
    const filePath = `${id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("task_materials").upload(filePath, file);
    if (uploadError) {
      toast.error(uploadError.message);
      return;
    }
    const { data: urlData } = supabase.storage.from("task_materials").getPublicUrl(filePath);
    await supabase
      .from("task_materials")
      .insert({ task_id: id!, name: file.name, type: "file", url: urlData.publicUrl, uploaded_by: user.id });
    queryClient.invalidateQueries({ queryKey: ["materials", id] });
    toast.success("Plik przesłany");
  }

  async function addLinkMaterial() {
    if (!linkName.trim() || !linkUrl.trim() || !user) return;
    await supabase
      .from("task_materials")
      .insert({ task_id: id!, name: linkName, type: "link", url: linkUrl, uploaded_by: user.id });
    queryClient.invalidateQueries({ queryKey: ["materials", id] });
    setLinkDialogOpen(false);
    setLinkName("");
    setLinkUrl("");
    toast.success("Link dodany");
  }

  async function deleteMaterial(materialId: string) {
    await supabase.from("task_materials").delete().eq("id", materialId);
    queryClient.invalidateQueries({ queryKey: ["materials", id] });
  }

  async function toggleMaterialVisibility(materialId: string, visible: boolean) {
    const { error } = await supabase
      .from("task_materials")
      .update({ is_visible_to_client: visible } as any)
      .eq("id", materialId);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["materials", id] });
  }

  async function logTime(minutes: number) {
    if (minutes <= 0 || !user) return;
    const { error } = await supabase.from("time_logs").insert({ task_id: id!, user_id: user.id, duration: minutes });
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["time-logs", id] });
    toast.success(`Zalogowano ${minutes} min`);
  }

  function logManualTime() {
    const mins = parseInt(manualMinutes);
    if (isNaN(mins) || mins <= 0) {
      toast.error("Podaj poprawną liczbę minut");
      return;
    }
    logTime(mins);
    setManualMinutes("");
  }

  async function stopTimer() {
    const totalSecs = timer.stop();
    if (totalSecs < 60) return;
    await logTime(Math.round(totalSecs / 60));
  }

  async function addComment() {
    if (!commentText.trim() || !user) return;
    const { error } = await supabase
      .from("comments")
      .insert({ task_id: id!, user_id: user.id, content: commentText, type: commentType });
    if (error) {
      toast.error(error.message);
      return;
    }
    setCommentText("");
    queryClient.invalidateQueries({ queryKey: ["comments", id] });
  }

  async function handleClientComment() {
    if (!commentText.trim() || !user) return;
    const { error } = await supabase
      .from("comments")
      .insert({ task_id: id!, user_id: user.id, content: commentText, type: "client" });
    if (error) {
      toast.error(error.message);
      return;
    }
    setCommentText("");
    queryClient.invalidateQueries({ queryKey: ["comments", id] });
  }

  function formatTimer(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  }

  function formatDuration(minutes: number) {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  async function handleClientChange(newClientId: string | null) {
    if (!task) return;
    const { error } = await supabase
      .from("tasks")
      .update({ client_id: newClientId, updated_at: new Date().toISOString() } as any)
      .eq("id", task.id);
    if (error) {
      toast.error("Błąd aktualizacji klienta");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["task", id] });
    setClientPickerOpen(false);
    toast.success(newClientId ? "Klient przypisany" : "Powiązanie usunięte");
  }

  const saveTitle = useCallback(async () => {
    if (!task || isSavingTitle) return;
    const trimmed = titleValue.trim();
    if (!trimmed || trimmed === task.title) {
      setIsEditingTitle(false);
      return;
    }
    setIsSavingTitle(true);
    const { error } = await supabase
      .from("tasks")
      .update({ title: trimmed, updated_at: new Date().toISOString() } as any)
      .eq("id", task.id);
    setIsSavingTitle(false);
    if (error) {
      toast.error("Błąd zapisu tytułu");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["task", id] });
    setIsEditingTitle(false);
    toast.success("Tytuł zaktualizowany");
  }, [task, titleValue, isSavingTitle, queryClient, id]);

  async function handlePriorityChange(newPriority: string) {
    if (!task || newPriority === task.priority) return;
    const { error } = await supabase
      .from("tasks")
      .update({ priority: newPriority as any, updated_at: new Date().toISOString() } as any)
      .eq("id", task.id);
    if (error) {
      toast.error("Błąd");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["task", id] });
  }

  async function handleDeadlineChange(newDate: Date | undefined) {
    if (!task) return;
    const { error } = await supabase
      .from("tasks")
      .update({
        due_date: newDate
          ? `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, "0")}-${String(newDate.getDate()).padStart(2, "0")}`
          : null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", task.id);
    if (error) {
      toast.error("Błąd");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["task", id] });
  }

  // ─── Loading / Error ───
  if (isLoading)
    return (
      <AppLayout title="Zadanie">
        <div className="p-8 text-muted-foreground">Ładowanie...</div>
      </AppLayout>
    );
  if (!task)
    return (
      <AppLayout title="Zadanie">
        <div className="p-8 text-muted-foreground">Nie znaleziono zadania.</div>
      </AppLayout>
    );

  const showAssignOverlay = hasNoAssignment && !isClient && !isPreviewMode;

  // ─── Context object ───
  const ctx = {
    task,
    id,
    user,
    isClient,
    isPreviewMode,
    setIsPreviewMode,
    canEditInline,
    assignments,
    comments,
    timeLogs,
    checklists,
    materials,
    statusHistory,
    corrections,
    allProfiles,
    allClients,
    unassignedProfiles,
    totalLogged,
    isOverdue,
    hasNoAssignment,
    briefFilledCount,
    isEditingTitle,
    setIsEditingTitle,
    titleValue,
    setTitleValue,
    isSavingTitle,
    saveTitle,
    titleInputRef,
    handleStatusChange,
    handlePriorityChange,
    handleDeadlineChange,
    handleClientChange,
    addAssignment,
    removeAssignment,
    assignOpen,
    setAssignOpen,
    clientPickerOpen,
    setClientPickerOpen,
    setVerificationSendOpen,
    setRejectReviewOpen,
    setNotUnderstoodOpen,
    clearNotUnderstood,
    handleClientAccept,
    clientReviewOpen,
    setClientReviewOpen,
    correctionSeverity,
    setCorrectionSeverity,
    correctionText,
    setCorrectionText,
    handleClientReject,
    commentText,
    setCommentText,
    commentType,
    setCommentType,
    addComment,
    handleClientComment,
    newChecklistName,
    setNewChecklistName,
    newChecklistItemTexts,
    setNewChecklistItemTexts,
    addChecklist,
    addChecklistItem,
    toggleChecklistItem,
    fileInputRef,
    uploadFile,
    addLinkMaterial,
    deleteMaterial,
    toggleMaterialVisibility,
    linkDialogOpen,
    setLinkDialogOpen,
    timer,
    formatTimer,
    formatDuration,
    logTime,
    logManualTime,
    stopTimer,
    manualMinutes,
    setManualMinutes,
    openBriefEditor,
    queryClient,
    statusLabels,
    statusColors,
  };

  return (
    <AppLayout title={task.title}>
      {/* Unassigned overlay */}
      {showAssignOverlay && (
        <div className="mb-3">
          <Card className="border-2 border-destructive bg-destructive/5">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="h-4 w-4 text-destructive" />
                <p className="text-xs font-bold text-destructive">Zadanie nie ma przypisanej osoby!</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {(allProfiles || []).map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => addAssignment(p.id, "primary")}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] border rounded-full hover:bg-accent bg-background"
                  >
                    <Avatar className="h-3.5 w-3.5">
                      <AvatarFallback className="text-[7px] bg-primary/10 text-primary font-bold">
                        {p.full_name
                          ?.split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .slice(0, 2) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    {p.full_name}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview banner */}
      {isPreviewMode && (
        <div className="flex items-center justify-between gap-3 bg-orange-500 text-white rounded-lg px-4 py-2 mb-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span className="text-xs font-semibold">Tryb podglądu klienta</span>
          </div>
          <Button
            size="sm"
            className="bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-[10px] h-6"
            onClick={() => setIsPreviewMode(false)}
          >
            Wyjdź
          </Button>
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="mb-3">
        {isClient ? (
          <Link
            to="/client/tasks"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Wróć do zadań
          </Link>
        ) : (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link to="/tasks" className="hover:text-foreground flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              Zadania
            </Link>
            {task.client_id && (task as any).clients?.name && (
              <>
                <ChevronRight className="h-3 w-3" />
                <Link to={`/clients/${task.client_id}`} className="hover:text-foreground truncate max-w-[150px]">
                  {(task as any).clients.name}
                </Link>
              </>
            )}
            {task.project_id && (task as any).projects?.name && (
              <>
                <ChevronRight className="h-3 w-3" />
                <Link to={`/projects/${task.project_id}`} className="hover:text-foreground truncate max-w-[150px]">
                  {(task as any).projects.name}
                </Link>
              </>
            )}
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground/60 truncate max-w-[200px]">{task.title}</span>
          </div>
        )}
      </div>

      {/* 3-column layout */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-3 lg:h-[calc(100vh-140px)] lg:overflow-hidden">
        {/* Left column */}
        <div className="lg:col-span-3 lg:overflow-y-auto lg:border-r border-border mb-4 lg:mb-0">
          <LeftPanel ctx={ctx} />
        </div>

        {/* Middle column */}
        <div className="lg:col-span-6 lg:overflow-y-auto mb-4 lg:mb-0 lg:flex lg:flex-col">
          <MiddleTabs ctx={ctx} />
        </div>

        {/* Right column - desktop only */}
        <div className="hidden lg:flex lg:col-span-3 lg:overflow-hidden lg:border-l border-border lg:flex-col">
          <CommPanel ctx={ctx} />
        </div>
      </div>

      {/* Mobile comments button */}
      <div className="fixed bottom-4 right-4 lg:hidden z-40">
        <Button onClick={() => setCommSheetOpen(true)} className="rounded-full h-12 w-12 shadow-lg">
          <MessageSquare className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile comments sheet */}
      <Sheet open={commSheetOpen} onOpenChange={setCommSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Komunikacja
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <CommPanel ctx={ctx} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialogs */}
      <Dialog open={briefOpen} onOpenChange={setBriefOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edytuj brief zadania</DialogTitle>
            <DialogDescription>Uzupełnij pola briefu.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 overflow-y-auto flex-1 px-1 py-1">
            {briefFields.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label className="text-sm">{f.label}</Label>
                <Textarea
                  value={briefForm[f.key] || ""}
                  onChange={(e) => setBriefForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={`Wpisz ${f.label.toLowerCase()}...`}
                  className="min-h-[60px] text-sm w-full"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBriefOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={saveBrief}>Zapisz brief</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Dodaj link</DialogTitle>
            <DialogDescription>Podaj nazwę i adres URL.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-sm">Nazwa</Label>
              <Input
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                placeholder="Nazwa"
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">URL</Label>
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={addLinkMaterial}>Dodaj link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
      <RejectionModal open={rejectReviewOpen} onOpenChange={setRejectReviewOpen} onConfirm={handleRejectFromReview} />
    </AppLayout>
  );
}
