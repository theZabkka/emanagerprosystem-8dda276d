import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  UserPlus, Edit3, Eye, X, CalendarIcon, Building2, CheckCircle2,
  AlertTriangle, HelpCircle, ShieldCheck, Bug
} from "lucide-react";
import { statusLabels, statusColors } from "@/lib/statusConfig";

const priorityLabels: Record<string, string> = { critical: "PILNY", high: "WYSOKI", medium: "ŚREDNI", low: "NISKI" };
const priorityColors: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-950",
  medium: "border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-950",
  low: "border-muted text-muted-foreground",
};
const roleLabels: Record<string, string> = { primary: "Główny", collaborator: "Współpracownik", reviewer: "Recenzent" };

export function LeftPanel({ ctx }: { ctx: any }) {
  const {
    task, id, isClient, isPreviewMode, canEditInline, assignments, allProfiles,
    allClients, unassignedProfiles, isOverdue, hasNoAssignment, totalLogged,
    isEditingTitle, setIsEditingTitle, titleValue, setTitleValue, isSavingTitle,
    saveTitle, titleInputRef, handleStatusChange, handlePriorityChange,
    handleDeadlineChange, handleClientChange, addAssignment, removeAssignment,
    setIsPreviewMode, setVerificationSendOpen, setRejectReviewOpen,
    setNotUnderstoodOpen, clearNotUnderstood, handleClientAccept,
    clientReviewOpen, setClientReviewOpen, correctionSeverity, setCorrectionSeverity,
    correctionText, setCorrectionText, handleClientReject, assignOpen, setAssignOpen,
    clientPickerOpen, setClientPickerOpen, user, queryClient,
  } = ctx;

  return (
    <div className="space-y-3 p-3 lg:p-4">
      {/* Title */}
      {canEditInline && isEditingTitle ? (
        <Input
          ref={titleInputRef} autoFocus value={titleValue}
          onChange={e => setTitleValue(e.target.value)} disabled={isSavingTitle}
          className="text-sm font-bold h-auto py-1 px-1"
          onBlur={saveTitle}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); saveTitle(); }
            if (e.key === "Escape") { setIsEditingTitle(false); setTitleValue(task.title); }
          }}
        />
      ) : (
        <div
          className={cn("group flex items-start gap-1.5", canEditInline && "cursor-pointer")}
          onClick={() => { if (!canEditInline) return; setTitleValue(task.title); setIsEditingTitle(true); }}
        >
          <h1 className="text-sm font-bold leading-tight">{task.title}</h1>
          {canEditInline && <Edit3 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0" />}
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[9px] font-mono h-5">#{task.id.slice(0, 8)}</Badge>
        {!isPreviewMode && !isClient ? (
          <Popover>
            <PopoverTrigger asChild>
              <button><Badge className={`text-[9px] font-bold h-5 cursor-pointer ${statusColors[task.status] || "bg-muted"}`}>{statusLabels[task.status] || task.status}</Badge></button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-1" align="start">
              {Object.entries(statusLabels).map(([k, v]) => (
                <button key={k} onClick={() => handleStatusChange(k)}
                  className={`w-full text-left px-2 py-1 text-xs rounded-sm hover:bg-accent ${k === task.status ? "font-bold bg-accent/50" : ""}`}>
                  <Badge className={`text-[8px] ${statusColors[k]}`}>{v}</Badge>
                </button>
              ))}
            </PopoverContent>
          </Popover>
        ) : (
          <Badge className={`text-[9px] font-bold h-5 ${statusColors[task.status] || "bg-muted"}`}>{statusLabels[task.status] || task.status}</Badge>
        )}
        {canEditInline ? (
          <Popover>
            <PopoverTrigger asChild>
              <button><Badge className={`text-[9px] font-bold h-5 border cursor-pointer ${priorityColors[task.priority] || ""}`}>{priorityLabels[task.priority] || task.priority} ▾</Badge></button>
            </PopoverTrigger>
            <PopoverContent className="w-32 p-1" align="start">
              {Object.entries(priorityLabels).map(([k, v]) => (
                <button key={k} onClick={() => handlePriorityChange(k)}
                  className={`w-full text-left px-2 py-1 text-xs rounded-sm hover:bg-accent ${k === task.priority ? "font-bold bg-accent/50" : ""}`}>
                  <Badge className={`text-[8px] border ${priorityColors[k]}`}>{v}</Badge>
                </button>
              ))}
            </PopoverContent>
          </Popover>
        ) : (
          <Badge className={`text-[9px] font-bold h-5 border ${priorityColors[task.priority] || ""}`}>{priorityLabels[task.priority] || task.priority}</Badge>
        )}
        {hasNoAssignment && <Badge className="bg-destructive text-destructive-foreground text-[9px] h-5">NIEPRZYPISANE</Badge>}
        {isOverdue && <Badge className="bg-destructive text-destructive-foreground text-[9px] h-5">PO TERMINIE</Badge>}
        {task.type && <Badge variant="secondary" className="text-[9px] h-5">{task.type}</Badge>}
      </div>

      <Separator className="my-2" />

      {/* Overlapping avatars */}
      {!isPreviewMode && !isClient && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Przypisani</p>
          <div className="flex items-center">
            <div className="flex -space-x-2">
              {(assignments || []).map((a: any) => (
                <div key={a.user_id} className="relative group/avatar">
                  <Avatar className="h-7 w-7 border-2 border-background cursor-default" title={`${a.profiles?.full_name} (${roleLabels[a.role] || a.role})`}>
                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                      {a.profiles?.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <button onClick={() => removeAssignment(a.user_id)}
                    className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                    <X className="h-2 w-2" />
                  </button>
                </div>
              ))}
            </div>
            <Popover open={assignOpen} onOpenChange={setAssignOpen}>
              <PopoverTrigger asChild>
                <button className="h-7 w-7 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center ml-1 hover:bg-accent transition-colors">
                  <UserPlus className="h-3 w-3 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-2" align="start">
                <div className="max-h-40 overflow-y-auto space-y-0.5">
                  {unassignedProfiles.map((p: any) => (
                    <button key={p.id} onClick={() => { addAssignment(p.id); setAssignOpen(false); }}
                      className="w-full flex items-center gap-2 px-2 py-1 rounded-sm hover:bg-accent text-left text-xs">
                      <Avatar className="h-4 w-4"><AvatarFallback className="text-[7px] bg-primary/10 text-primary font-bold">{p.full_name?.split(" ").map((n: string) => n[0]).join("") || "?"}</AvatarFallback></Avatar>
                      {p.full_name}
                    </button>
                  ))}
                  {unassignedProfiles.length === 0 && <p className="text-[10px] text-muted-foreground py-1">Wszyscy przypisani</p>}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          {assignments?.length === 0 && <p className="text-[10px] text-destructive font-medium">Brak przypisanych osób</p>}
        </div>
      )}

      <Separator className="my-2" />

      {/* Data block */}
      <div className="space-y-1 text-xs">
        <DataRow label="Klient">
          {canEditInline ? (
            <Popover open={clientPickerOpen} onOpenChange={setClientPickerOpen}>
              <PopoverTrigger asChild>
                <button className="text-foreground hover:underline font-medium text-right truncate max-w-[120px]">
                  {task.client_id && (task as any).clients?.name || "—"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-0" align="end">
                <Command>
                  <CommandInput placeholder="Szukaj..." className="h-7 text-xs" />
                  <CommandList>
                    <CommandEmpty>Brak</CommandEmpty>
                    <CommandGroup>
                      <CommandItem onSelect={() => handleClientChange(null)} className="text-muted-foreground text-xs"><X className="h-3 w-3 mr-1" />Brak</CommandItem>
                      {(allClients || []).map((c: any) => (
                        <CommandItem key={c.id} value={c.name} onSelect={() => handleClientChange(c.id)} className="text-xs">
                          {c.name}{c.id === task.client_id && <CheckCircle2 className="h-3 w-3 ml-auto text-primary" />}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          ) : (
            <span className="font-medium truncate max-w-[120px]">{task.client_id && (task as any).clients?.name || "—"}</span>
          )}
        </DataRow>
        <DataRow label="Projekt">
          <span className="font-medium truncate max-w-[120px]">{(task as any).projects?.name || "—"}</span>
        </DataRow>
        <DataRow label="Termin">
          {canEditInline ? (
            <Popover>
              <PopoverTrigger asChild>
                <button className={cn("font-medium hover:underline", isOverdue && "text-destructive")}>
                  {task.due_date ? format(new Date(task.due_date), "dd.MM.yyyy") : "—"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={task.due_date ? new Date(task.due_date) : undefined}
                  onSelect={handleDeadlineChange} initialFocus className="p-2 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          ) : (
            <span className={cn("font-medium", isOverdue && "text-destructive")}>{task.due_date ? new Date(task.due_date).toLocaleDateString("pl-PL") : "—"}</span>
          )}
        </DataRow>
        <DataRow label="Utworzono">
          <span className="font-medium">{new Date(task.created_at).toLocaleDateString("pl-PL")}</span>
        </DataRow>
      </div>

      {/* Misunderstood banner */}
      {(task as any).is_misunderstood && !isPreviewMode && !isClient && (
        <MisunderstoodBanner task={task} onResolve={clearNotUnderstood} />
      )}

      {/* Bug severity */}
      {(task as any).bug_severity && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 space-y-1">
          <div className="flex items-center gap-1.5">
            <Bug className="h-3 w-3 text-destructive" />
            <span className="text-[10px] font-semibold text-destructive">{(task as any).bug_severity === "critical" ? "Krytyczny błąd" : "Błąd"}</span>
          </div>
          {(task as any).bug_reason && <p className="text-[10px]">{(task as any).bug_reason}</p>}
        </div>
      )}

      {/* Actions - staff only */}
      {!isPreviewMode && !isClient && (
        <>
          <Separator className="my-2" />
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Podejmij działania</p>
            {(task.status === "review" || task.status === "corrections") && (
              <Button size="sm" className="w-full justify-start text-[11px] gap-1.5 h-7 bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => {
                  if (totalLogged <= 0) { toast.error("Brak zalogowanego czasu. Musisz zalogować czas pracy przed wysłaniem zadania do klienta."); return; }
                  setVerificationSendOpen(true);
                }}>
                <ShieldCheck className="h-3 w-3" />Do akceptacji klienta
              </Button>
            )}
            {task.status === "review" && (
              <Button variant="destructive" size="sm" className="w-full justify-start text-[11px] gap-1.5 h-7" onClick={() => setRejectReviewOpen(true)}>
                <AlertTriangle className="h-3 w-3" />Odrzuć (do poprawek)
              </Button>
            )}
            {!["review", "client_review", "client_verified", "done", "closed", "cancelled"].includes(task.status || "") && (
              <Button variant="outline" size="sm" className="w-full justify-start text-[11px] gap-1.5 h-7 border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10"
                onClick={async () => {
                  try {
                    const { error } = await supabase.rpc("change_task_status", { _task_id: task.id, _new_status: "review", _changed_by: user?.id, _note: "Przekazano do weryfikacji (quick action)" });
                    if (error) throw error;
                    toast.success("Zadanie przekazane do weryfikacji");
                    queryClient.invalidateQueries({ queryKey: ["task"] });
                    queryClient.invalidateQueries({ queryKey: ["status-history", id] });
                  } catch (err: any) { toast.error("Błąd: " + (err.message || "Nie udało się zmienić statusu")); }
                }}>
                <CheckCircle2 className="h-3 w-3" />Przekaż do weryfikacji
              </Button>
            )}
            {(task.status === "in_progress" || task.status === "todo") && !(task as any).is_misunderstood && (
              <Button variant="outline" size="sm" className="w-full justify-start text-[11px] gap-1.5 h-7 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                onClick={() => setNotUnderstoodOpen(true)}>
                <HelpCircle className="h-3 w-3" />Nie rozumiem polecenia
              </Button>
            )}
          </div>
        </>
      )}

      {/* Client review actions */}
      {isClient && task.status === "client_review" && (
        <>
          <Separator className="my-2" />
          <ClientReviewSection
            clientReviewOpen={clientReviewOpen} setClientReviewOpen={setClientReviewOpen}
            correctionSeverity={correctionSeverity} setCorrectionSeverity={setCorrectionSeverity}
            correctionText={correctionText} setCorrectionText={setCorrectionText}
            handleClientAccept={handleClientAccept} handleClientReject={handleClientReject}
          />
        </>
      )}

      {/* Preview mode toggle */}
      {!isClient && (
        <>
          <Separator className="my-2" />
          {isPreviewMode ? (
            <Button size="sm" className="w-full text-[11px] h-7 bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold"
              onClick={() => setIsPreviewMode(false)}>Wyjdź z trybu podglądu</Button>
          ) : (
            <Button variant="outline" size="sm" className="w-full text-[11px] gap-1.5 h-7" onClick={() => setIsPreviewMode(true)}>
              <Eye className="h-3 w-3" />Zobacz jako klient
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function DataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function MisunderstoodBanner({ task, onResolve }: { task: any; onResolve: () => void }) {
  const { data: reporter } = useQuery({
    queryKey: ["misunderstood-reporter", task.misunderstood_by],
    staleTime: 10 * 60 * 1000
    queryFn: async () => {
      if (!task.misunderstood_by) return null;
      const { data } = await supabase.from("profiles").select("full_name").eq("id", task.misunderstood_by).single();
      return data;
    },
    enabled: !!task.misunderstood_by,
  });
  return (
    <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-2 space-y-1">
      <div className="flex items-start gap-1.5">
        <HelpCircle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">{reporter?.full_name || "Pracownik"} zgłosił niezrozumienie</p>
          {task.misunderstood_reason && <p className="text-[10px] text-muted-foreground mt-0.5">„{task.misunderstood_reason}"</p>}
        </div>
      </div>
      <Button variant="outline" size="sm" className="text-[10px] h-5 w-full" onClick={onResolve}>Oznacz jako wyjaśnione</Button>
    </div>
  );
}

function ClientReviewSection({ clientReviewOpen, setClientReviewOpen, correctionSeverity, setCorrectionSeverity, correctionText, setCorrectionText, handleClientAccept, handleClientReject }: any) {
  if (!clientReviewOpen) {
    return (
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Akcja wymagana</p>
        <Button size="sm" className="w-full text-[11px] h-7 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleClientAccept}>
          <CheckCircle2 className="h-3 w-3" />Akceptuję
        </Button>
        <Button variant="destructive" size="sm" className="w-full text-[11px] h-7 gap-1.5" onClick={() => setClientReviewOpen(true)}>
          <AlertTriangle className="h-3 w-3" />Do poprawy
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <Label className="text-[11px] font-semibold">Rodzaj poprawek</Label>
      <div className="flex gap-1">
        <Button variant={correctionSeverity === "normal" ? "default" : "outline"} size="sm" onClick={() => setCorrectionSeverity("normal")} className="flex-1 text-[10px] h-6">Drobne</Button>
        <Button variant={correctionSeverity === "critical" ? "destructive" : "outline"} size="sm" onClick={() => setCorrectionSeverity("critical")} className="flex-1 text-[10px] h-6">Krytyczne</Button>
      </div>
      <Textarea value={correctionText} onChange={(e: any) => setCorrectionText(e.target.value)} placeholder="Co wymaga poprawy?" className="min-h-[60px] text-xs" />
      <div className="flex gap-1">
        <Button variant="outline" size="sm" className="flex-1 text-[10px] h-6" onClick={() => { setClientReviewOpen(false); setCorrectionText(""); }}>Anuluj</Button>
        <Button variant="destructive" size="sm" className="flex-1 text-[10px] h-6" disabled={!correctionText.trim()} onClick={handleClientReject}>Wyślij</Button>
      </div>
    </div>
  );
}
