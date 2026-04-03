import { useState, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { DescriptionCard } from "@/components/tasks/DescriptionCard";
import { StatusTimeline } from "@/components/tasks/StatusTimeline";
import { DeleteTaskModal } from "@/components/tasks/DeleteTaskModal";
import {
  Plus, Clock, Play, FileText, Link as LinkIcon, Upload, Timer,
  Edit3, Eye, Trash2, AlertTriangle, X, Bug, Archive, Shield
} from "lucide-react";

const briefFields = [
  { key: "brief_goal", label: "Cel zadania" },
  { key: "brief_deliverable", label: "Co dostarczyć" },
  { key: "brief_format", label: "Format dostarczenia" },
  { key: "brief_input_materials", label: "Materiały wejściowe" },
  { key: "brief_dont_do", label: "Czego NIE robić" },
  { key: "brief_inspiration", label: "Wzorzec / inspiracja" },
];

export function MiddleTabs({ ctx }: { ctx: any }) {
  const {
    task, id, isClient, isPreviewMode, canEditInline,
    checklists, materials, timeLogs, statusHistory, corrections,
    totalLogged, briefFilledCount,
    newChecklistName, setNewChecklistName, newChecklistItemTexts, setNewChecklistItemTexts,
    addChecklist, addChecklistItem, toggleChecklistItem,
    fileInputRef, uploadFile, addLinkMaterial, deleteMaterial, toggleMaterialVisibility,
    linkDialogOpen, setLinkDialogOpen,
    timer, formatTimer, formatDuration, logTime, logManualTime, stopTimer,
    manualMinutes, setManualMinutes,
    openBriefEditor, queryClient,
  } = ctx;

  const showTimeTab = !isPreviewMode && !isClient;
  const showHistoryTab = !isPreviewMode && !isClient;

  const currentRole: string = ctx.currentRole || "";
  const normalizedRole = currentRole.toLowerCase().replace(/\s/g, "");
  const canArchive = ["superadmin", "boss", "koordynator"].includes(normalizedRole);
  const canDelete = ["superadmin", "boss"].includes(normalizedRole);
  const showManagementTab = !isClient && !isPreviewMode && (canArchive || canDelete);

  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <Tabs defaultValue="description" className="h-full flex flex-col">
      <TabsList className="w-full justify-start overflow-x-auto shrink-0 bg-transparent rounded-none border-b border-border h-9 gap-1 p-0">
        <TabsTrigger value="description" className="text-[11px] px-3 py-1 rounded-none border-b-2 border-transparent text-muted-foreground hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-destructive data-[state=active]:border-destructive data-[state=active]:shadow-none">Opis i Brief</TabsTrigger>
        <TabsTrigger value="execution" className="text-[11px] px-3 py-1 rounded-none border-b-2 border-transparent text-muted-foreground hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-destructive data-[state=active]:border-destructive data-[state=active]:shadow-none">Realizacja</TabsTrigger>
        {showTimeTab && <TabsTrigger value="time" className="text-[11px] px-3 py-1 rounded-none border-b-2 border-transparent text-muted-foreground hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-destructive data-[state=active]:border-destructive data-[state=active]:shadow-none">Czas pracy</TabsTrigger>}
        <TabsTrigger value="materials" className="text-[11px] px-3 py-1 rounded-none border-b-2 border-transparent text-muted-foreground hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-destructive data-[state=active]:border-destructive data-[state=active]:shadow-none">Materiały</TabsTrigger>
        {showHistoryTab && <TabsTrigger value="history" className="text-[11px] px-3 py-1 rounded-none border-b-2 border-transparent text-muted-foreground hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-destructive data-[state=active]:border-destructive data-[state=active]:shadow-none">Historia</TabsTrigger>}
        {showManagementTab && <TabsTrigger value="management" className="text-[11px] px-3 py-1 rounded-none border-b-2 border-transparent text-muted-foreground hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-destructive data-[state=active]:border-destructive data-[state=active]:shadow-none">Zarządzanie</TabsTrigger>}
      </TabsList>

      <div className="flex-1 overflow-y-auto p-3 lg:p-4">
        {/* Tab 1: Description & Brief */}
        <TabsContent value="description" className="mt-0 space-y-3">
          <DescriptionCard
            description={task.description}
            taskId={task.id}
            canEdit={canEditInline}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ["task", id] })}
          />
          <Accordion type="single" collapsible className="border rounded-lg">
            <AccordionItem value="brief" className="border-0">
              <AccordionTrigger className="px-3 py-2 text-xs font-semibold hover:no-underline">
                <div className="flex items-center gap-2">
                  Brief zadania
                  <Badge variant="outline" className={cn("text-[9px] h-4", briefFilledCount === 0 ? "text-destructive" : briefFilledCount < briefFields.length ? "text-amber-600" : "text-emerald-600")}>
                    {briefFilledCount}/{briefFields.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3 space-y-2">
                {!isClient && !isPreviewMode && (
                  <Button variant="outline" size="sm" className="text-[10px] h-6 gap-1" onClick={openBriefEditor}>
                    <Edit3 className="h-3 w-3" />Edytuj brief
                  </Button>
                )}
                {briefFilledCount === 0 && !isClient && !isPreviewMode && (
                  <div className="flex items-center gap-1.5 text-[10px] text-destructive bg-destructive/10 rounded px-2 py-1">
                    <AlertTriangle className="h-3 w-3" />Brief pusty
                  </div>
                )}
                {briefFilledCount > 0 && (
                  <div className="space-y-1.5">
                    {briefFields.map(f => {
                      const val = (task as any)[f.key];
                      if (!val) return null;
                      return (
                        <div key={f.key}>
                          <Label className="text-[9px] text-muted-foreground uppercase tracking-wider">{f.label}</Label>
                          <p className="text-xs">{val}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* Tab 2: Execution (Checklists) */}
        <TabsContent value="execution" className="mt-0 space-y-3">
          {checklists && checklists.length > 0 ? (
            <div className="space-y-3">
              {checklists.map((cl: any) => {
                const total = (cl.items || []).length;
                const done = (cl.items || []).filter((i: any) => i.is_completed).length;
                return (
                  <Card key={cl.id} className="border">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold">{cl.title}</p>
                        {total > 0 && <span className="text-[10px] text-muted-foreground">{done}/{total}</span>}
                      </div>
                      {total > 0 && <Progress value={(done / total) * 100} className="h-1" />}
                      {(cl.items || []).map((item: any) => (
                        <div key={item.id} className="flex items-center gap-2 pl-1">
                          <Checkbox checked={item.is_completed} disabled={item.is_na || isPreviewMode || isClient}
                            onCheckedChange={() => !isPreviewMode && !isClient && toggleChecklistItem(item.id, item.is_completed)}
                            className="h-3.5 w-3.5" />
                          <span className={cn("text-xs", item.is_completed && "line-through text-muted-foreground", item.is_na && "text-muted-foreground italic")}>
                            {item.title}
                          </span>
                          {item.is_na && <Badge variant="outline" className="text-[8px] h-3.5">N/A</Badge>}
                        </div>
                      ))}
                      {!isClient && !isPreviewMode && (
                        <div className="flex gap-1 pl-1">
                          <Input placeholder="Dodaj element..." value={newChecklistItemTexts[cl.id] || ""}
                            onChange={(e: any) => setNewChecklistItemTexts((prev: any) => ({ ...prev, [cl.id]: e.target.value }))}
                            onKeyDown={(e: any) => e.key === "Enter" && addChecklistItem(cl.id)} className="text-xs h-6" />
                          <Button size="sm" variant="ghost" onClick={() => addChecklistItem(cl.id)} className="h-6 w-6 p-0"><Plus className="h-3 w-3" /></Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-4 text-center">Brak list kontrolnych.</p>
          )}
          {!isClient && !isPreviewMode && (
            <>
              <Separator />
              <div className="flex gap-1.5">
                <Input placeholder="Nazwa nowej listy..." value={newChecklistName}
                  onChange={(e: any) => setNewChecklistName(e.target.value)}
                  onKeyDown={(e: any) => e.key === "Enter" && addChecklist()} className="text-xs h-7" />
                <Button variant="outline" size="sm" className="text-[10px] gap-1 h-7 shrink-0" onClick={addChecklist}><Plus className="h-3 w-3" />Dodaj</Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* Tab 3: Time tracking */}
        {showTimeTab && (
          <TabsContent value="time" className="mt-0 space-y-3">
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
            {task.estimated_time > 0 && <Progress value={Math.min((totalLogged / task.estimated_time) * 100, 100)} className="h-1.5" />}
            <div className="flex flex-wrap gap-1">
              {[5, 15, 30, 60, 120].map(m => (
                <Button key={m} variant="outline" size="sm" className="text-[10px] h-6" onClick={() => logTime(m)}>
                  +{m >= 60 ? `${m / 60}h` : `${m}m`}
                </Button>
              ))}
            </div>
            <div className="flex gap-1.5 items-center">
              <Input type="number" placeholder="Min..." value={manualMinutes}
                onChange={(e: any) => setManualMinutes(e.target.value)}
                onKeyDown={(e: any) => e.key === "Enter" && logManualTime()}
                className="text-xs h-7 w-24" min={1} />
              <Button size="sm" variant="outline" className="text-[10px] h-7 gap-1" onClick={logManualTime}>
                <Clock className="h-3 w-3" />Zaloguj
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono font-bold">{formatTimer(timer.elapsed)}</span>
              {!timer.isRunning ? (
                <Button size="sm" variant="outline" onClick={() => timer.start()} className="gap-1 text-[10px] h-7">
                  <Play className="h-3 w-3" />Start
                </Button>
              ) : (
                <Button size="sm" variant="destructive" onClick={stopTimer} className="gap-1 text-[10px] h-7">
                  <Timer className="h-3 w-3" />Stop & zaloguj
                </Button>
              )}
            </div>
            {timeLogs && timeLogs.length > 0 && (
              <>
                <Separator />
                <p className="text-[10px] font-semibold text-muted-foreground">Historia</p>
                <div className="space-y-1">
                  {timeLogs.map((l: any) => (
                    <div key={l.id} className="flex items-center gap-1.5 text-xs">
                      <Avatar className="h-4 w-4"><AvatarFallback className="text-[7px] bg-primary/10 text-primary font-bold">{l.profiles?.full_name?.split(" ").map((n: string) => n[0]).join("") || "?"}</AvatarFallback></Avatar>
                      <span className="font-medium truncate">{l.profiles?.full_name}</span>
                      <span className="font-semibold">{formatDuration(l.duration)}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">{new Date(l.created_at).toLocaleString("pl-PL")}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        )}

        {/* Tab 4: Materials */}
        <TabsContent value="materials" className="mt-0 space-y-3">
          {!isPreviewMode && !isClient && (
            <div className="flex gap-1.5">
              <input ref={fileInputRef} type="file" className="hidden" onChange={(e: any) => { if (e.target.files?.[0]) uploadFile(e.target.files[0]); e.target.value = ""; }} />
              <Button variant="outline" size="sm" className="text-[10px] gap-1 h-7" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-3 w-3" />Plik
              </Button>
              <Button variant="outline" size="sm" className="text-[10px] gap-1 h-7" onClick={() => setLinkDialogOpen(true)}>
                <LinkIcon className="h-3 w-3" />Link
              </Button>
            </div>
          )}
          {(() => {
            const mats = (isPreviewMode || isClient) ? (materials || []).filter((m: any) => m.is_visible_to_client) : (materials || []);
            return mats.length > 0 ? (
              <div className="space-y-1.5">
                {mats.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-2 p-2 rounded border bg-muted/30 group text-xs">
                    {m.type === "link" ? <LinkIcon className="h-3.5 w-3.5 text-blue-500 shrink-0" /> : <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    <div className="flex-1 min-w-0">
                      {m.url ? (
                        <a href={m.url} target="_blank" rel="noopener noreferrer" className="truncate block hover:underline text-primary text-xs">{m.name}</a>
                      ) : <span className="truncate block">{m.name}</span>}
                      <span className="text-[9px] text-muted-foreground">{m.profiles?.full_name} · {new Date(m.created_at).toLocaleDateString("pl-PL")}</span>
                    </div>
                    {!isPreviewMode && !isClient && (
                      <label className="flex items-center gap-1 cursor-pointer shrink-0">
                        <Checkbox checked={!!m.is_visible_to_client} onCheckedChange={(checked: any) => toggleMaterialVisibility(m.id, !!checked)} className="h-3 w-3" />
                        <Eye className={cn("h-3 w-3", m.is_visible_to_client ? "text-emerald-600" : "text-muted-foreground/40")} />
                      </label>
                    )}
                    {!isPreviewMode && !isClient && (
                      <button onClick={() => deleteMaterial(m.id)} className="opacity-0 group-hover:opacity-100 text-destructive transition-opacity"><Trash2 className="h-3 w-3" /></button>
                    )}
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-muted-foreground py-4 text-center">Brak materiałów.</p>;
          })()}
        </TabsContent>

        {/* Tab 5: History & Analysis */}
        {showHistoryTab && (
          <TabsContent value="history" className="mt-0 space-y-4">
            <StatusTimeline statusHistory={statusHistory || []} currentStatus={task?.status || "new"} taskId={id} />
            {corrections && corrections.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold flex items-center gap-1.5"><Bug className="h-3.5 w-3.5 text-orange-500" />Poprawki ({corrections.length})</p>
                {corrections.map((c: any) => (
                  <div key={c.id} className={cn("rounded border p-2 space-y-1 text-xs", c.severity === "critical" ? "border-destructive/40 bg-destructive/5" : "border-amber-400/40 bg-amber-500/5")}>
                    <div className="flex items-center gap-1.5">
                      <Badge className={cn("text-[8px] font-bold", c.severity === "critical" ? "bg-destructive text-destructive-foreground" : "bg-amber-500/15 text-amber-700 border-amber-400/40")}>
                        {c.severity === "critical" ? "KRYTYCZNE" : "Drobne"}
                      </Badge>
                      <Badge variant="outline" className={cn("text-[8px]", c.status === "resolved" && "bg-emerald-500/15 text-emerald-700")}>
                        {c.status === "resolved" ? "Rozwiązane" : "Oczekujące"}
                      </Badge>
                      <span className="text-[9px] text-muted-foreground ml-auto">{new Date(c.created_at).toLocaleString("pl-PL")}</span>
                    </div>
                    <p>{c.description}</p>
                    {c.profiles?.full_name && <p className="text-[9px] text-muted-foreground">Zgłosił: {c.profiles.full_name}</p>}
                  </div>
                ))}
              </div>
            )}
            {/* Time analysis */}
            {task.estimated_time > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold">Analiza czasu</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded border p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Szacowany</p>
                    <p className="font-bold">{ctx.formatDuration(task.estimated_time)}</p>
                  </div>
                  <div className="rounded border p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Rzeczywisty</p>
                    <p className={cn("font-bold", totalLogged > task.estimated_time && "text-destructive")}>{ctx.formatDuration(totalLogged)}</p>
                  </div>
                </div>
                <Progress value={Math.min((totalLogged / task.estimated_time) * 100, 100)} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground text-center">
                  {totalLogged > task.estimated_time
                    ? `Przekroczono o ${ctx.formatDuration(totalLogged - task.estimated_time)}`
                    : `Pozostało ${ctx.formatDuration(task.estimated_time - totalLogged)}`}
                </p>
              </div>
            )}
          </TabsContent>
        )}
      </div>
    </Tabs>
  );
}
