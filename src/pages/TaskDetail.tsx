import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDataSource } from "@/hooks/useDataSource";
import {
  mockTasks, mockClients, mockProjects, mockTaskAssignments, mockProfiles,
  mockSubtasks, mockComments, mockTimeLogs, mockChecklists, mockChecklistItems,
  mockTaskMaterials, mockStatusHistory,
} from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import {
  ChevronRight, Plus, Send, Clock, Play, FileText, Link as LinkIcon,
  CheckCircle2, MessageCircle, History, AlertTriangle, Eye, Zap,
  Upload, Timer, UserPlus, Edit3, Bug, Lock, X, Trash2
} from "lucide-react";

const statusLabels: Record<string, string> = {
  new: "NOWE", todo: "DO ZROBIENIA", in_progress: "W REALIZACJI", review: "WERYFIKACJA",
  corrections: "POPRAWKI", client_review: "DO AKCEPTACJI KLIENTA", done: "GOTOWE", cancelled: "ANULOWANE",
};
const priorityLabels: Record<string, string> = { critical: "PILNY", high: "WYSOKI", medium: "ŚREDNI", low: "NISKI" };
const priorityColors: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-950",
  medium: "border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-950",
  low: "border-muted text-muted-foreground",
};
const statusColors: Record<string, string> = {
  new: "bg-muted text-muted-foreground",
  todo: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  in_progress: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  review: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  corrections: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  client_review: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  done: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  cancelled: "bg-muted text-muted-foreground line-through",
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

// ─── Demo state store (mutable for demo interactivity) ────────────
let demoSubtasksState: typeof mockSubtasks = [...mockSubtasks];
let demoCommentsState: typeof mockComments = [...mockComments];
let demoTimeLogsState: typeof mockTimeLogs = [...mockTimeLogs];
let demoChecklistsState: typeof mockChecklists = [...mockChecklists];
let demoChecklistItemsState: typeof mockChecklistItems = [...mockChecklistItems];
let demoMaterialsState: typeof mockTaskMaterials = [...mockTaskMaterials];
let demoStatusHistoryState: typeof mockStatusHistory = [...mockStatusHistory];
let demoAssignmentsState: typeof mockTaskAssignments = [...mockTaskAssignments];
let demoTasksState: typeof mockTasks = [...mockTasks];

function resetDemoState() {
  demoSubtasksState = [...mockSubtasks];
  demoCommentsState = [...mockComments];
  demoTimeLogsState = [...mockTimeLogs];
  demoChecklistsState = [...mockChecklists];
  demoChecklistItemsState = [...mockChecklistItems];
  demoMaterialsState = [...mockTaskMaterials];
  demoStatusHistoryState = [...mockStatusHistory];
  demoAssignmentsState = [...mockTaskAssignments];
  demoTasksState = [...mockTasks];
}

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isDemo } = useDataSource();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [commentType, setCommentType] = useState("internal");
  const [commentFilter, setCommentFilter] = useState("all");
  const [newSubtask, setNewSubtask] = useState("");
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset demo state on mount
  useEffect(() => { if (isDemo) resetDemoState(); }, [isDemo]);

  const demoUserId = "demo-user-1";
  const currentUserId = isDemo ? demoUserId : user?.id;

  // ─── Queries ─────────────────────────────────────────────────────
  const { data: task, isLoading } = useQuery({
    queryKey: ["task", id, isDemo],
    queryFn: async () => {
      if (isDemo) {
        const t = demoTasksState.find(t => t.id === id);
        if (!t) return null;
        const client = mockClients.find(c => c.id === t.client_id);
        const project = mockProjects.find(p => p.id === t.project_id);
        return { ...t, clients: client ? { name: client.name } : null, projects: project ? { name: project.name } : null };
      }
      const { data, error } = await supabase.from("tasks").select("*, clients(name), projects(name)").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: assignments } = useQuery({
    queryKey: ["task-assignments", id, isDemo],
    queryFn: async () => {
      if (isDemo) {
        return demoAssignmentsState.filter(a => a.task_id === id).map(a => ({
          ...a, profiles: mockProfiles.find(p => p.id === a.user_id) || null,
        }));
      }
      const { data } = await supabase.from("task_assignments").select("*, profiles:user_id(full_name, avatar_url)").eq("task_id", id!);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: allProfiles } = useQuery({
    queryKey: ["all-profiles", isDemo],
    queryFn: async () => {
      if (isDemo) return mockProfiles;
      const { data } = await supabase.from("profiles").select("*");
      return data || [];
    },
  });

  const { data: subtasks } = useQuery({
    queryKey: ["subtasks", id, isDemo],
    queryFn: async () => {
      if (isDemo) return demoSubtasksState.filter(s => s.task_id === id);
      const { data } = await supabase.from("subtasks").select("*").eq("task_id", id!).order("created_at");
      return data || [];
    },
    enabled: !!id,
  });

  const { data: comments } = useQuery({
    queryKey: ["comments", id, isDemo],
    queryFn: async () => {
      if (isDemo) return demoCommentsState.filter(c => c.task_id === id);
      const { data } = await supabase.from("comments").select("*, profiles:user_id(full_name)").eq("task_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: timeLogs } = useQuery({
    queryKey: ["time-logs", id, isDemo],
    queryFn: async () => {
      if (isDemo) return demoTimeLogsState.filter(t => t.task_id === id);
      const { data } = await supabase.from("time_logs").select("*, profiles:user_id(full_name)").eq("task_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: checklists } = useQuery({
    queryKey: ["checklists", id, isDemo],
    queryFn: async () => {
      if (isDemo) {
        return demoChecklistsState.filter(cl => cl.task_id === id).map(cl => ({
          ...cl,
          items: demoChecklistItemsState.filter(i => i.checklist_id === cl.id),
        }));
      }
      const { data: cls } = await supabase.from("checklists").select("*, checklist_items(*)").eq("task_id", id!).order("created_at");
      return (cls || []).map((cl: any) => ({ ...cl, items: cl.checklist_items || [] }));
    },
    enabled: !!id,
  });

  const { data: materials } = useQuery({
    queryKey: ["materials", id, isDemo],
    queryFn: async () => {
      if (isDemo) return demoMaterialsState.filter(m => m.task_id === id);
      const { data } = await supabase.from("task_materials").select("*, profiles:uploaded_by(full_name)").eq("task_id", id!).order("created_at");
      return data || [];
    },
    enabled: !!id,
  });

  const { data: statusHistory } = useQuery({
    queryKey: ["status-history", id, isDemo],
    queryFn: async () => {
      if (isDemo) return demoStatusHistoryState.filter(h => h.task_id === id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const { data } = await supabase.from("task_status_history").select("*, profiles:changed_by(full_name)").eq("task_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  // Real-time
  useEffect(() => {
    if (!id || isDemo) return;
    const channel = supabase
      .channel(`task-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "subtasks", filter: `task_id=eq.${id}` }, () => queryClient.invalidateQueries({ queryKey: ["subtasks", id] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `task_id=eq.${id}` }, () => queryClient.invalidateQueries({ queryKey: ["comments", id] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "time_logs", filter: `task_id=eq.${id}` }, () => queryClient.invalidateQueries({ queryKey: ["time-logs", id] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "task_status_history", filter: `task_id=eq.${id}` }, () => queryClient.invalidateQueries({ queryKey: ["status-history", id] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "task_assignments", filter: `task_id=eq.${id}` }, () => queryClient.invalidateQueries({ queryKey: ["task-assignments", id] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "checklists", filter: `task_id=eq.${id}` }, () => queryClient.invalidateQueries({ queryKey: ["checklists", id] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "task_materials", filter: `task_id=eq.${id}` }, () => queryClient.invalidateQueries({ queryKey: ["materials", id] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, isDemo, queryClient]);

  // Timer
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  // ─── Actions ─────────────────────────────────────────────────────

  // 1. Status change
  async function handleStatusChange(newStatus: string) {
    if (!task || newStatus === task.status) return;
    const oldStatus = task.status;
    if (isDemo) {
      const idx = demoTasksState.findIndex(t => t.id === id);
      if (idx >= 0) demoTasksState[idx] = { ...demoTasksState[idx], status: newStatus as any };
      demoStatusHistoryState.unshift({
        id: `demo-sh-${Date.now()}`, task_id: id!, old_status: oldStatus, new_status: newStatus,
        changed_by: demoUserId, created_at: new Date().toISOString(),
        profiles: { full_name: mockProfiles.find(p => p.id === demoUserId)?.full_name || "Demo" },
      });
      queryClient.invalidateQueries({ queryKey: ["task", id, isDemo] });
      queryClient.invalidateQueries({ queryKey: ["status-history", id, isDemo] });
      toast.success(`Status zmieniony na ${statusLabels[newStatus]}`);
      return;
    }
    const { error } = await supabase.from("tasks").update({ status: newStatus as any, updated_at: new Date().toISOString() }).eq("id", task.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("task_status_history").insert({ task_id: task.id, old_status: oldStatus, new_status: newStatus, changed_by: user?.id });
    queryClient.invalidateQueries({ queryKey: ["task", id] });
    queryClient.invalidateQueries({ queryKey: ["status-history", id] });
    toast.success(`Status zmieniony na ${statusLabels[newStatus]}`);
  }

  // 2. Brief editing
  function openBriefEditor() {
    if (!task) return;
    const form: Record<string, string> = {};
    briefFields.forEach(f => { form[f.key] = (task as any)[f.key] || ""; });
    setBriefForm(form);
    setBriefOpen(true);
  }

  async function saveBrief() {
    if (!task) return;
    if (isDemo) {
      const idx = demoTasksState.findIndex(t => t.id === id);
      if (idx >= 0) demoTasksState[idx] = { ...demoTasksState[idx], ...briefForm };
      queryClient.invalidateQueries({ queryKey: ["task", id, isDemo] });
      setBriefOpen(false);
      toast.success("Brief zapisany");
      return;
    }
    const { error } = await supabase.from("tasks").update(briefForm as any).eq("id", task.id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["task", id] });
    setBriefOpen(false);
    toast.success("Brief zapisany");
  }

  // 3. Assignments
  async function addAssignment(userId: string, role: string = "collaborator") {
    if (isDemo) {
      if (demoAssignmentsState.some(a => a.task_id === id && a.user_id === userId)) {
        toast.info("Ta osoba jest już przypisana"); return;
      }
      demoAssignmentsState.push({ task_id: id!, user_id: userId, role: role as any });
      queryClient.invalidateQueries({ queryKey: ["task-assignments", id, isDemo] });
      toast.success("Osoba przypisana");
      return;
    }
    const { error } = await supabase.from("task_assignments").insert({ task_id: id!, user_id: userId, role: role as any });
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["task-assignments", id] });
    toast.success("Osoba przypisana");
  }

  async function removeAssignment(userId: string) {
    if (isDemo) {
      demoAssignmentsState = demoAssignmentsState.filter(a => !(a.task_id === id && a.user_id === userId));
      queryClient.invalidateQueries({ queryKey: ["task-assignments", id, isDemo] });
      toast.success("Osoba usunięta");
      return;
    }
    await supabase.from("task_assignments").delete().eq("task_id", id!).eq("user_id", userId);
    queryClient.invalidateQueries({ queryKey: ["task-assignments", id] });
    toast.success("Osoba usunięta");
  }

  // 4. Subtasks
  async function addSubtask() {
    if (!newSubtask.trim()) return;
    if (isDemo) {
      demoSubtasksState.push({
        id: `demo-sub-${Date.now()}`, task_id: id!, title: newSubtask, is_completed: false,
        assigned_to: null, created_at: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["subtasks", id, isDemo] });
      setNewSubtask("");
      toast.success("Podzadanie dodane");
      return;
    }
    const { error } = await supabase.from("subtasks").insert({ task_id: id!, title: newSubtask });
    if (error) { toast.error(error.message); return; }
    setNewSubtask("");
    queryClient.invalidateQueries({ queryKey: ["subtasks", id] });
    toast.success("Podzadanie dodane");
  }

  async function toggleSubtask(subtaskId: string, completed: boolean) {
    if (isDemo) {
      const idx = demoSubtasksState.findIndex(s => s.id === subtaskId);
      if (idx >= 0) demoSubtasksState[idx] = { ...demoSubtasksState[idx], is_completed: !completed };
      queryClient.invalidateQueries({ queryKey: ["subtasks", id, isDemo] });
      return;
    }
    await supabase.from("subtasks").update({ is_completed: !completed }).eq("id", subtaskId);
    queryClient.invalidateQueries({ queryKey: ["subtasks", id] });
  }

  // 5. Checklists
  async function addChecklist() {
    if (!newChecklistName.trim()) return;
    if (isDemo) {
      demoChecklistsState.push({
        id: `demo-cl-${Date.now()}`, task_id: id!, title: newChecklistName, created_at: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["checklists", id, isDemo] });
      setNewChecklistName("");
      toast.success("Lista kontrolna dodana");
      return;
    }
    const { error } = await supabase.from("checklists").insert({ task_id: id!, title: newChecklistName });
    if (error) { toast.error(error.message); return; }
    setNewChecklistName("");
    queryClient.invalidateQueries({ queryKey: ["checklists", id] });
    toast.success("Lista kontrolna dodana");
  }

  async function addChecklistItem(checklistId: string) {
    const text = newChecklistItemTexts[checklistId]?.trim();
    if (!text) return;
    if (isDemo) {
      demoChecklistItemsState.push({
        id: `demo-cli-${Date.now()}`, checklist_id: checklistId, title: text,
        is_completed: false, is_na: false, evidence_url: null, created_at: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["checklists", id, isDemo] });
      setNewChecklistItemTexts(prev => ({ ...prev, [checklistId]: "" }));
      return;
    }
    await supabase.from("checklist_items").insert({ checklist_id: checklistId, title: text });
    queryClient.invalidateQueries({ queryKey: ["checklists", id] });
    setNewChecklistItemTexts(prev => ({ ...prev, [checklistId]: "" }));
  }

  async function toggleChecklistItem(itemId: string, completed: boolean) {
    if (isDemo) {
      const idx = demoChecklistItemsState.findIndex(i => i.id === itemId);
      if (idx >= 0) demoChecklistItemsState[idx] = { ...demoChecklistItemsState[idx], is_completed: !completed };
      queryClient.invalidateQueries({ queryKey: ["checklists", id, isDemo] });
      return;
    }
    await supabase.from("checklist_items").update({ is_completed: !completed }).eq("id", itemId);
    queryClient.invalidateQueries({ queryKey: ["checklists", id] });
  }

  // 6. Materials
  async function uploadFile(file: File) {
    if (isDemo) {
      demoMaterialsState.push({
        id: `demo-mat-${Date.now()}`, task_id: id!, name: file.name, type: "file",
        url: null, is_visible_to_client: false, uploaded_by: demoUserId, created_at: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["materials", id, isDemo] });
      toast.success("Plik dodany (demo)");
      return;
    }
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
    if (isDemo) {
      demoMaterialsState.push({
        id: `demo-mat-${Date.now()}`, task_id: id!, name: linkName, type: "link",
        url: linkUrl, is_visible_to_client: false, uploaded_by: demoUserId, created_at: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["materials", id, isDemo] });
      setLinkDialogOpen(false); setLinkName(""); setLinkUrl("");
      toast.success("Link dodany");
      return;
    }
    if (!user) return;
    await supabase.from("task_materials").insert({
      task_id: id!, name: linkName, type: "link", url: linkUrl, uploaded_by: user.id,
    });
    queryClient.invalidateQueries({ queryKey: ["materials", id] });
    setLinkDialogOpen(false); setLinkName(""); setLinkUrl("");
    toast.success("Link dodany");
  }

  async function deleteMaterial(materialId: string) {
    if (isDemo) {
      demoMaterialsState = demoMaterialsState.filter(m => m.id !== materialId);
      queryClient.invalidateQueries({ queryKey: ["materials", id, isDemo] });
      toast.success("Materiał usunięty");
      return;
    }
    await supabase.from("task_materials").delete().eq("id", materialId);
    queryClient.invalidateQueries({ queryKey: ["materials", id] });
    toast.success("Materiał usunięty");
  }

  // 7. Time logging
  async function logTime(minutes: number) {
    if (minutes <= 0) return;
    if (isDemo) {
      demoTimeLogsState.unshift({
        id: `demo-tl-${Date.now()}`, task_id: id!, user_id: demoUserId, duration: minutes,
        description: null, phase: null, created_at: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["time-logs", id, isDemo] });
      toast.success(`Zalogowano ${minutes} min`);
      return;
    }
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
    if (timerSeconds < 60) { setTimerRunning(false); setTimerSeconds(0); return; }
    const minutes = Math.round(timerSeconds / 60);
    await logTime(minutes);
    setTimerRunning(false);
    setTimerSeconds(0);
  }

  // 8. Comments
  async function addComment() {
    if (!commentText.trim()) return;
    if (isDemo) {
      demoCommentsState.unshift({
        id: `demo-com-${Date.now()}`, task_id: id!, user_id: demoUserId, content: commentText,
        type: commentType, created_at: new Date().toISOString(),
        profiles: { full_name: mockProfiles.find(p => p.id === demoUserId)?.full_name || "Demo" },
      });
      queryClient.invalidateQueries({ queryKey: ["comments", id, isDemo] });
      setCommentText("");
      toast.success("Komentarz dodany");
      return;
    }
    if (!user) return;
    const { error } = await supabase.from("comments").insert({ task_id: id!, user_id: user.id, content: commentText, type: commentType });
    if (error) { toast.error(error.message); return; }
    setCommentText("");
    queryClient.invalidateQueries({ queryKey: ["comments", id] });
    toast.success("Komentarz dodany");
  }

  // Client visibility toggle
  async function toggleClientVisible() {
    if (!task) return;
    const newVal = !(task as any).is_client_visible;
    if (isDemo) {
      const idx = demoTasksState.findIndex(t => t.id === id);
      if (idx >= 0) demoTasksState[idx] = { ...demoTasksState[idx], is_client_visible: newVal };
      queryClient.invalidateQueries({ queryKey: ["task", id, isDemo] });
      toast.success("Widoczność zmieniona");
      return;
    }
    await supabase.from("tasks").update({ is_client_visible: newVal } as any).eq("id", task.id);
    queryClient.invalidateQueries({ queryKey: ["task", id] });
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

  // ─── Computed ────────────────────────────────────────────────────
  const briefFilledCount = useMemo(() => {
    if (!task) return 0;
    return briefFields.filter(f => (task as any)[f.key]).length;
  }, [task]);

  const totalLogged = timeLogs?.reduce((sum: number, l: any) => sum + l.duration, 0) || 0;
  const completedSubtasks = subtasks?.filter((s: any) => s.is_completed).length || 0;
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

  return (
    <AppLayout title={task.title}>
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Client Preview Banner */}
        {isPreviewMode && (
          <div className="flex items-center justify-between gap-4 bg-orange-500 text-white rounded-lg px-5 py-3">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              <span className="text-sm font-semibold">Tryb podglądu klienta — widzisz dokładnie to co widzi klient. Żadne zmiany nie są zapisywane.</span>
            </div>
            <Button size="sm" className="bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs" onClick={() => setIsPreviewMode(false)}>
              Wyjdź z trybu podglądu
            </Button>
          </div>
        )}

        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link to="/tasks" className="hover:text-foreground transition-colors">Zadania</Link>
          <ChevronRight className="h-3 w-3" />
          {task.clients?.name && <><Link to="/clients" className="hover:text-foreground transition-colors">{task.clients.name}</Link><ChevronRight className="h-3 w-3" /></>}
          {task.projects?.name && <><span>{task.projects.name}</span><ChevronRight className="h-3 w-3" /></>}
          <span className="text-foreground font-medium">{task.title}</span>
        </div>

        {/* Action buttons row */}
        <div className="flex flex-wrap items-center gap-2">
          {!isPreviewMode ? (
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => setIsPreviewMode(true)}><Eye className="h-3 w-3" />Zobacz jako klient</Button>
          ) : (
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => setIsPreviewMode(false)}><Eye className="h-3 w-3" />Wróć do widoku pełnego</Button>
          )}
          {!isPreviewMode && <Button variant="outline" size="sm" className="text-xs gap-1.5"><FileText className="h-3 w-3" />Zastosuj szablon</Button>}
          {!isPreviewMode && <Button variant="outline" size="sm" className="text-xs gap-1.5"><Zap className="h-3 w-3" />Uruchom automatyzację</Button>}
          {!isPreviewMode && <Button size="sm" className="text-xs gap-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground"><MessageCircle className="h-3 w-3" />Czat zadania</Button>}
        </div>

        {/* Tags row with status dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono">#{task.id.slice(0, 8)}</Badge>
          {!isPreviewMode ? (
            <Popover>
              <PopoverTrigger asChild>
                <button className="cursor-pointer">
                  <Badge className={`text-[10px] font-bold ${statusColors[task.status] || "bg-muted"} hover:opacity-80 transition-opacity`}>
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
            <Badge className={`text-[10px] font-bold ${statusColors[task.status] || "bg-muted"}`}>
              {statusLabels[task.status] || task.status}
            </Badge>
          )}
          <Badge className={`text-[10px] font-bold border ${priorityColors[task.priority] || ""}`}>{priorityLabels[task.priority] || task.priority}</Badge>
          {hasNoAssignment && <Badge className="bg-destructive text-destructive-foreground text-[10px] font-bold">NIEPRZYPISANE!</Badge>}
          {isOverdue && <Badge className="bg-destructive text-destructive-foreground text-[10px] font-bold">PO TERMINIE</Badge>}
          {task.type && <Badge variant="secondary" className="text-[10px]">{task.type}</Badge>}
          <div className="ml-auto">
            {task.due_date && (
              <span className={`text-sm font-semibold ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                Termin: {new Date(task.due_date).toLocaleDateString("pl-PL")}
              </span>
            )}
          </div>
        </div>

        {/* Title & description */}
        <div>
          <h1 className="text-xl font-bold">{task.title}</h1>
          {task.clients?.name && <p className="text-sm text-muted-foreground mt-0.5">{task.clients.name} {task.projects?.name && `• ${task.projects.name}`}</p>}
          {task.description && <p className="text-sm mt-2 text-muted-foreground">{task.description}</p>}
        </div>

        {/* Cards grid */}
        <div className="space-y-4">

          {/* Brief - hidden in preview */}
          {!isPreviewMode && <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Brief zadania</CardTitle>
                <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={openBriefEditor}><Edit3 className="h-3 w-3" />Edytuj brief</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Progress value={(briefFilledCount / briefFields.length) * 100} className="h-2 flex-1" />
                <span className={`text-xs font-semibold ${briefFilledCount === 0 ? "text-destructive" : briefFilledCount < briefFields.length ? "text-amber-600" : "text-green-600"}`}>
                  {briefFilledCount}/{briefFields.length} pól
                </span>
              </div>
              {briefFilledCount === 0 && (
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
          </Card>}

          {/* Assigned people - hidden in preview */}
          {!isPreviewMode && <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Przypisane osoby</CardTitle>
                <Popover open={assignOpen} onOpenChange={setAssignOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs gap-1.5"><UserPlus className="h-3 w-3" />Dodaj</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="end">
                    <p className="text-xs font-semibold mb-2">Wybierz osobę</p>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {unassignedProfiles.map((p: any) => (
                        <button key={p.id} onClick={() => { addAssignment(p.id); setAssignOpen(false); }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent transition-colors text-left">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                              {p.full_name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{p.full_name}</span>
                        </button>
                      ))}
                      {unassignedProfiles.length === 0 && <p className="text-xs text-muted-foreground py-2">Wszyscy są już przypisani</p>}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </CardHeader>
            <CardContent>
              {assignments && assignments.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {assignments.map((a: any) => (
                    <div key={a.user_id} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 group relative">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                          {a.profiles?.full_name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium leading-none">{a.profiles?.full_name}</p>
                        <p className="text-[10px] text-muted-foreground">{roleLabels[a.role] || a.role}</p>
                      </div>
                      <button onClick={() => removeAssignment(a.user_id)}
                        className="opacity-0 group-hover:opacity-100 absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center transition-opacity">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-destructive font-medium">Brak przypisanych osób!</p>
              )}
            </CardContent>
          </Card>

          {/* Bug / Workflow status */}
          {(task as any).bug_severity && (
            <Card className="border-destructive">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Bug className="h-4 w-4 text-destructive" />
                  <CardTitle className="text-sm font-semibold text-destructive">
                    {(task as any).bug_severity === "critical" ? "Poważny błąd" : "Zgłoszony błąd"}
                  </CardTitle>
                  <Badge className="bg-destructive text-destructive-foreground text-[10px] ml-auto">{(task as any).bug_severity === "critical" ? "KRYTYCZNY" : "NORMALNY"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {(task as any).bug_reason && (
                  <div className="bg-destructive/5 rounded-md px-3 py-2 text-sm">
                    <span className="font-medium text-destructive">Powód od klienta: </span>
                    {(task as any).bug_reason}
                  </div>
                )}
                {(task as any).bug_description && (
                  <p className="text-sm text-muted-foreground">{(task as any).bug_description}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Subtasks */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Podzadania <span className="text-muted-foreground font-normal ml-1">{completedSubtasks} z {subtasks?.length || 0} Ukończonych</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {subtasks?.map((s: any) => (
                <div key={s.id} className="flex items-center gap-2 py-0.5">
                  <Checkbox checked={s.is_completed} disabled={isPreviewMode} onCheckedChange={() => !isPreviewMode && toggleSubtask(s.id, s.is_completed)} />
                  <span className={`text-sm flex-1 ${s.is_completed ? "line-through text-muted-foreground" : ""}`}>{s.title}</span>
                </div>
              ))}
              {!isPreviewMode && (
              <div className="flex gap-2 pt-1">
                <Input placeholder="Dodaj podzadanie..." value={newSubtask} onChange={e => setNewSubtask(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addSubtask()} className="text-sm h-8" />
                <Button size="sm" variant="outline" onClick={addSubtask} className="h-8 w-8 p-0"><Plus className="h-3 w-3" /></Button>
              </div>
              )}
            </CardContent>
          </Card>

          {/* Checklists */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Lista kontrolna</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {checklists && checklists.length > 0 && (
                <div className="space-y-4">
                  {checklists.map((cl: any) => (
                    <div key={cl.id} className="space-y-2">
                      <p className="text-sm font-medium">{cl.title}</p>
                      {(cl.items || []).map((item: any) => (
                        <div key={item.id} className="flex items-center gap-2 pl-2">
                          <Checkbox checked={item.is_completed} disabled={item.is_na}
                            onCheckedChange={() => toggleChecklistItem(item.id, item.is_completed)} />
                          <span className={`text-sm ${item.is_completed ? "line-through text-muted-foreground" : ""} ${item.is_na ? "text-muted-foreground italic" : ""}`}>
                            {item.title}
                          </span>
                          {item.is_na && <Badge variant="outline" className="text-[9px] h-4">N/A</Badge>}
                        </div>
                      ))}
                      <div className="flex gap-2 pl-2">
                        <Input placeholder="Dodaj element..." value={newChecklistItemTexts[cl.id] || ""}
                          onChange={e => setNewChecklistItemTexts(prev => ({ ...prev, [cl.id]: e.target.value }))}
                          onKeyDown={e => e.key === "Enter" && addChecklistItem(cl.id)} className="text-sm h-7" />
                        <Button size="sm" variant="ghost" onClick={() => addChecklistItem(cl.id)} className="h-7 w-7 p-0"><Plus className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {(!checklists || checklists.length === 0) && (
                <p className="text-sm text-muted-foreground">Brak list kontrolnych.</p>
              )}
              <Separator />
              <div className="flex gap-2">
                <Input placeholder="Nazwa nowej listy kontrolnej..." value={newChecklistName}
                  onChange={e => setNewChecklistName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addChecklist()} className="text-sm h-8" />
                <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8" onClick={addChecklist}><Plus className="h-3 w-3" />Dodaj listę</Button>
              </div>
            </CardContent>
          </Card>

          {/* Client visible toggle */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Widoczne dla klienta</p>
                  <p className="text-xs text-muted-foreground">Klient będzie widział to zadanie w swoim panelu</p>
                </div>
                <Switch checked={(task as any).is_client_visible || false} onCheckedChange={toggleClientVisible} />
              </div>
            </CardContent>
          </Card>

          {/* Materials */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Materiały <span className="text-muted-foreground font-normal">({materials?.length || 0})</span></CardTitle>
                <div className="flex gap-1.5">
                  <input ref={fileInputRef} type="file" className="hidden" onChange={e => { if (e.target.files?.[0]) uploadFile(e.target.files[0]); e.target.value = ""; }} />
                  <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => fileInputRef.current?.click()}><Upload className="h-3 w-3" />Plik</Button>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => setLinkDialogOpen(true)}><LinkIcon className="h-3 w-3" />Link</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {materials && materials.length > 0 ? (
                <div className="space-y-2">
                  {materials.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-2 p-2 rounded-md border bg-muted/30 group">
                      {m.type === "link" ? <LinkIcon className="h-4 w-4 text-blue-500" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
                      <div className="flex-1 min-w-0">
                        {m.url ? (
                          <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-sm truncate block hover:underline text-primary">{m.name}</a>
                        ) : (
                          <span className="text-sm truncate block">{m.name}</span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {isDemo ? mockProfiles.find(p => p.id === m.uploaded_by)?.full_name : m.profiles?.full_name} • {new Date(m.created_at).toLocaleDateString("pl-PL")}
                        </span>
                      </div>
                      {m.is_visible_to_client && <Badge variant="outline" className="text-[9px] h-4">Klient</Badge>}
                      <button onClick={() => deleteMaterial(m.id)}
                        className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Brak materiałów.</p>
              )}
            </CardContent>
          </Card>

          {/* Time tracking */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Czas pracy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Łącznie zalogowany</p>
                  <p className="text-lg font-bold">{formatDuration(totalLogged)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Szacowany</p>
                  <p className="text-lg font-bold">{task.estimated_time ? formatDuration(task.estimated_time) : "—"}</p>
                </div>
              </div>
              {task.estimated_time > 0 && (
                <Progress value={Math.min((totalLogged / task.estimated_time) * 100, 100)} className="h-2" />
              )}
              <div className="flex flex-wrap gap-1.5">
                {[5, 15, 30, 60, 120].map(m => (
                  <Button key={m} variant="outline" size="sm" className="text-xs h-7" onClick={() => logTime(m)}>
                    +{m >= 60 ? `${m / 60} godz` : `${m} min`}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <Input type="number" placeholder="Minuty..." value={manualMinutes}
                  onChange={e => setManualMinutes(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && logManualTime()}
                  className="text-sm h-8 w-28" min={1} />
                <Button size="sm" variant="outline" className="text-xs h-8" onClick={logManualTime}>
                  <Clock className="h-3 w-3 mr-1" />Zaloguj
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-lg font-mono font-bold">{formatTimer(timerSeconds)}</span>
                {!timerRunning ? (
                  <Button size="sm" variant="outline" onClick={() => setTimerRunning(true)} className="gap-1.5 text-xs">
                    <Play className="h-3 w-3" />Uruchom stoper
                  </Button>
                ) : (
                  <Button size="sm" variant="destructive" onClick={stopTimer} className="gap-1.5 text-xs">
                    <Timer className="h-3 w-3" />Zatrzymaj i zaloguj
                  </Button>
                )}
              </div>
              {timeLogs && timeLogs.length > 0 && (
                <>
                  <Separator />
                  <p className="text-xs font-semibold text-muted-foreground">Historia logowania czasu</p>
                  <div className="space-y-2">
                    {timeLogs.map((l: any) => (
                      <div key={l.id} className="flex items-center gap-2 text-sm">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                            {(isDemo ? mockProfiles.find(p => p.id === l.user_id)?.full_name : l.profiles?.full_name)?.split(" ").map((n: string) => n[0]).join("") || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{isDemo ? mockProfiles.find(p => p.id === l.user_id)?.full_name : l.profiles?.full_name}</span>
                        <span className="text-muted-foreground">—</span>
                        <span className="font-semibold">{formatDuration(l.duration)}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("pl-PL")}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Komentarze</CardTitle>
                <div className="flex gap-1">
                  {["all", "internal", "client"].map(f => (
                    <Button key={f} variant={commentFilter === f ? "default" : "outline"} size="sm" className="text-[10px] h-6 px-2"
                      onClick={() => setCommentFilter(f)}>
                      {f === "all" ? "Wszystkie" : f === "internal" ? "Wewnętrzne" : "Klient"}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-3">
                {filteredComments.length > 0 ? filteredComments.map((c: any) => (
                  <div key={c.id} className="flex gap-3">
                    <Avatar className="h-7 w-7 mt-0.5">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                        {(c.profiles?.full_name || (isDemo ? mockProfiles.find(p => p.id === c.user_id)?.full_name : "?") || "?").split(" ").map((n: string) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{c.profiles?.full_name || (isDemo ? mockProfiles.find(p => p.id === c.user_id)?.full_name : "?")}</span>
                        <Badge variant={c.type === "client" ? "default" : "outline"} className="text-[9px] h-4">
                          {c.type === "client" ? "Klient" : "Wewnętrzny"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString("pl-PL")}</span>
                      </div>
                      <p className="text-sm mt-0.5">{c.content}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">Brak komentarzy.</p>
                )}
              </div>
              <Separator />
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Checkbox id="internal-comment" checked={commentType === "internal"} onCheckedChange={(v) => setCommentType(v ? "internal" : "client")} />
                    <Label htmlFor="internal-comment" className="text-xs flex items-center gap-1 cursor-pointer">
                      <Lock className="h-3 w-3 text-amber-500" />
                      Komentarz wewnętrzny
                    </Label>
                  </div>
                  <Textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Napisz komentarz..."
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(); } }} className="min-h-[50px] text-sm" />
                </div>
                <Button size="icon" onClick={addComment} className="h-9 w-9"><Send className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>

          {/* Status history */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5"><History className="h-4 w-4" />Historia statusów</CardTitle>
            </CardHeader>
            <CardContent>
              {statusHistory && statusHistory.length > 0 ? (
                <div className="space-y-3">
                  {statusHistory.map((h: any, i: number) => (
                    <div key={h.id} className="flex items-start gap-3 relative">
                      {i < (statusHistory.length - 1) && <div className="absolute left-[11px] top-6 w-px h-full bg-border" />}
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 text-sm">
                          <Badge className={`text-[9px] ${statusColors[h.old_status] || "bg-muted"}`}>{statusLabels[h.old_status] || h.old_status || "—"}</Badge>
                          <span className="text-muted-foreground">→</span>
                          <Badge className={`text-[9px] ${statusColors[h.new_status] || "bg-muted"}`}>{statusLabels[h.new_status] || h.new_status}</Badge>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-bold">
                              {(h.profiles?.full_name || (isDemo ? mockProfiles.find(p => p.id === h.changed_by)?.full_name : "?") || "?").split(" ").map((n: string) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-xs text-muted-foreground">
                            {h.profiles?.full_name || (isDemo ? mockProfiles.find(p => p.id === h.changed_by)?.full_name : "?")} • {new Date(h.created_at).toLocaleString("pl-PL")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Brak historii statusów.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Brief Edit Dialog */}
      <Dialog open={briefOpen} onOpenChange={setBriefOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edytuj brief zadania</DialogTitle>
            <DialogDescription>Uzupełnij pola briefu, aby zespół wiedział, co i jak zrealizować.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {briefFields.map(f => (
              <div key={f.key} className="space-y-1">
                <Label className="text-sm">{f.label}</Label>
                <Textarea value={briefForm[f.key] || ""} onChange={e => setBriefForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={`Wpisz ${f.label.toLowerCase()}...`} className="min-h-[60px] text-sm" />
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
    </AppLayout>
  );
}
