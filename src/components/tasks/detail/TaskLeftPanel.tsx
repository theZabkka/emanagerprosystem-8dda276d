import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  UserPlus, X, CalendarIcon, Building2, CheckCircle2, Bug, AlertTriangle,
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

interface TaskLeftPanelProps {
  task: any;
  assignments: any[];
  allProfiles: any[];
  allClients: any[];
  canEditInline: boolean;
  isClient: boolean;
  isPreviewMode: boolean;
  isOverdue: boolean;
  onPriorityChange: (p: string) => void;
  onDeadlineChange: (d: Date | undefined) => void;
  onClientChange: (id: string | null) => void;
  onStatusChange: (s: string) => void;
  onAddAssignment: (userId: string, role?: string) => void;
  onRemoveAssignment: (userId: string) => void;
}

export function TaskLeftPanel({
  task, assignments, allProfiles, allClients, canEditInline,
  isClient, isPreviewMode, isOverdue,
  onPriorityChange, onDeadlineChange, onClientChange, onStatusChange,
  onAddAssignment, onRemoveAssignment,
}: TaskLeftPanelProps) {
  const [assignOpen, setAssignOpen] = useState(false);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);

  const assignedIds = new Set((assignments || []).map((a: any) => a.user_id));
  const unassignedProfiles = (allProfiles || []).filter((p: any) => !assignedIds.has(p.id));

  const MAX_VISIBLE = 4;
  const visibleAssignments = (assignments || []).slice(0, MAX_VISIBLE);
  const extraCount = Math.max(0, (assignments || []).length - MAX_VISIBLE);

  return (
    <div className="space-y-4">
      {/* Status */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Status</p>
        {canEditInline ? (
          <Popover>
            <PopoverTrigger asChild>
              <button className="cursor-pointer w-full">
                <Badge className={`text-xs font-bold w-full justify-center py-1 ${statusColors[task.status] || "bg-muted"} hover:opacity-80 transition-opacity`}>
                  {statusLabels[task.status] || task.status}
                </Badge>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="start">
              {Object.entries(statusLabels).map(([k, v]) => (
                <button key={k} onClick={() => onStatusChange(k)}
                  className={`w-full text-left px-3 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors ${k === task.status ? "font-bold bg-accent/50" : ""}`}>
                  <Badge className={`text-[9px] ${statusColors[k]}`}>{v}</Badge>
                </button>
              ))}
            </PopoverContent>
          </Popover>
        ) : (
          <Badge className={`text-xs font-bold w-full justify-center py-1 ${statusColors[task.status] || "bg-muted"}`}>
            {statusLabels[task.status] || task.status}
          </Badge>
        )}
      </div>

      <Separator />

      {/* Assigned People */}
      {!isPreviewMode && !isClient && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Przypisani</p>
            <Popover open={assignOpen} onOpenChange={setAssignOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><UserPlus className="h-3 w-3" /></Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                <p className="text-xs font-semibold mb-2">Wybierz osobę</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {unassignedProfiles.map((p: any) => (
                    <button key={p.id} onClick={() => { onAddAssignment(p.id); setAssignOpen(false); }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent transition-colors text-left">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                          {p.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{p.full_name}</span>
                    </button>
                  ))}
                  {unassignedProfiles.length === 0 && <p className="text-xs text-muted-foreground py-2">Wszyscy przypisani</p>}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          {assignments && assignments.length > 0 ? (
            <div className="space-y-1.5">
              {/* Avatar group row */}
              <div className="flex items-center -space-x-2">
                {visibleAssignments.map((a: any) => (
                  <Avatar key={a.user_id} className="h-7 w-7 border-2 border-background" title={a.profiles?.full_name}>
                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                      {a.profiles?.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?"}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {extraCount > 0 && (
                  <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                    +{extraCount}
                  </div>
                )}
              </div>
              {/* Compact list */}
              <div className="space-y-1">
                {(assignments || []).map((a: any) => (
                  <div key={a.user_id} className="flex items-center gap-2 group text-sm">
                    <span className="truncate flex-1">{a.profiles?.full_name}</span>
                    <span className="text-[10px] text-muted-foreground">{roleLabels[a.role] || a.role}</span>
                    <button onClick={() => onRemoveAssignment(a.user_id)}
                      className="opacity-0 group-hover:opacity-100 text-destructive h-4 w-4 flex items-center justify-center transition-opacity">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-destructive font-medium">Brak przypisanych!</p>
          )}
        </div>
      )}

      <Separator />

      {/* Priority */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Priorytet</p>
        {canEditInline ? (
          <Popover>
            <PopoverTrigger asChild>
              <button className="cursor-pointer w-full">
                <Badge className={`text-xs font-bold border w-full justify-center py-1 ${priorityColors[task.priority] || ""} hover:opacity-80 transition-opacity`}>
                  {priorityLabels[task.priority] || task.priority} ▾
                </Badge>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-36 p-1" align="start">
              {Object.entries(priorityLabels).map(([k, v]) => (
                <button key={k} onClick={() => onPriorityChange(k)}
                  className={`w-full text-left px-3 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors ${k === task.priority ? "font-bold bg-accent/50" : ""}`}>
                  <Badge className={`text-[9px] border ${priorityColors[k]}`}>{v}</Badge>
                </button>
              ))}
            </PopoverContent>
          </Popover>
        ) : (
          <Badge className={`text-xs font-bold border w-full justify-center py-1 ${priorityColors[task.priority] || ""}`}>
            {priorityLabels[task.priority] || task.priority}
          </Badge>
        )}
      </div>

      <Separator />

      {/* Client */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Klient</p>
        {canEditInline ? (
          <Popover open={clientPickerOpen} onOpenChange={setClientPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs gap-1.5 w-full justify-start h-8">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{task.client_id && task.clients?.name ? task.clients.name : "Brak klienta"}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <Command>
                <CommandInput placeholder="Szukaj klienta..." />
                <CommandList>
                  <CommandEmpty>Nie znaleziono</CommandEmpty>
                  <CommandGroup>
                    <CommandItem onSelect={() => onClientChange(null)} className="text-muted-foreground">
                      <X className="h-3 w-3 mr-2" /> Brak klienta
                    </CommandItem>
                    {(allClients || []).map((c: any) => (
                      <CommandItem key={c.id} value={c.name} onSelect={() => onClientChange(c.id)}>
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
        ) : task.client_id && task.clients?.name ? (
          <p className="text-sm flex items-center gap-1.5"><Building2 className="h-3 w-3" />{task.clients.name}</p>
        ) : (
          <p className="text-sm text-muted-foreground">—</p>
        )}
      </div>

      <Separator />

      {/* Dates */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Termin</p>
        {canEditInline ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("text-xs gap-1.5 w-full justify-start h-8", isOverdue && "border-destructive text-destructive")}>
                <CalendarIcon className="h-3 w-3 shrink-0" />
                {task.due_date ? format(new Date(task.due_date), "dd.MM.yyyy") : "Ustaw termin"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={task.due_date ? new Date(task.due_date) : undefined} onSelect={onDeadlineChange} initialFocus className="p-3 pointer-events-auto" />
              {task.due_date && (
                <div className="px-3 pb-3">
                  <Button variant="ghost" size="sm" className="w-full text-xs text-destructive" onClick={() => onDeadlineChange(undefined)}>
                    <X className="h-3 w-3 mr-1" /> Usuń termin
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        ) : (
          <p className={cn("text-sm", isOverdue ? "text-destructive font-semibold" : "text-muted-foreground")}>
            {task.due_date ? new Date(task.due_date).toLocaleDateString("pl-PL") : "—"}
          </p>
        )}
      </div>

      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Utworzono</p>
        <p className="text-sm text-muted-foreground">{new Date(task.created_at).toLocaleDateString("pl-PL")}</p>
      </div>

      {task.type && (
        <>
          <Separator />
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Typ</p>
            <Badge variant="secondary" className="text-xs">{task.type}</Badge>
          </div>
        </>
      )}

      {/* Bug severity */}
      {(task as any).bug_severity && (
        <>
          <Separator />
          <Card className="border-destructive">
            <CardContent className="pt-3 pb-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <Bug className="h-4 w-4 text-destructive" />
                <span className="text-sm font-semibold text-destructive">
                  {task.bug_severity === "critical" ? "Poważny błąd" : "Zgłoszony błąd"}
                </span>
              </div>
              {task.bug_reason && <p className="text-xs text-muted-foreground">{task.bug_reason}</p>}
            </CardContent>
          </Card>
        </>
      )}

      {/* Overdue / Unassigned warnings */}
      {isOverdue && (
        <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 rounded px-2 py-1.5">
          <AlertTriangle className="h-3 w-3" /> Po terminie!
        </div>
      )}
      {(!assignments || assignments.length === 0) && !isClient && (
        <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 rounded px-2 py-1.5">
          <UserPlus className="h-3 w-3" /> Nieprzypisane!
        </div>
      )}
    </div>
  );
}
