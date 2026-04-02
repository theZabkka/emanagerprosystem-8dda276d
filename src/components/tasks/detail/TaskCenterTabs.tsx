import { useState, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DescriptionCard } from "@/components/tasks/DescriptionCard";
import { StatusTimeline } from "@/components/tasks/StatusTimeline";
import {
  Plus, Edit3, FileText, Link as LinkIcon, Upload, Clock, Play, Timer,
  AlertTriangle, Eye, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const briefFields = [
  { key: "brief_goal", label: "Cel zadania" },
  { key: "brief_deliverable", label: "Co dostarczyć" },
  { key: "brief_format", label: "Format dostarczenia" },
  { key: "brief_input_materials", label: "Materiały wejściowe" },
  { key: "brief_dont_do", label: "Czego NIE robić" },
  { key: "brief_inspiration", label: "Wzorzec / inspiracja" },
];

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatTimer(s: number) {
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

interface TaskCenterTabsProps {
  task: any;
  taskId: string;
  checklists: any[];
  materials: any[];
  timeLogs: any[];
  statusHistory: any[];
  corrections: any[];
  totalLogged: number;
  canEditInline: boolean;
  isClient: boolean;
  isPreviewMode: boolean;
  timer: any;
  user: any;
  onLogTime: (minutes: number) => void;
  onStopTimer: () => void;
}

export function TaskCenterTabs({
  task, taskId, checklists, materials, timeLogs, statusHistory, corrections,
  totalLogged, canEditInline, isClient, isPreviewMode, timer, user, onLogTime, onStopTimer,
}: TaskCenterTabsProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Brief
  const [briefOpen, setBriefOpen] = useState(false);
  const [briefForm, setBriefForm] = useState<Record<string, string>>({});

  // Checklists
  const [newChecklistName, setNewChecklistName] = useState("");
  const [newChecklistItemTexts, setNewChecklistItemTexts] = useState<Record<string, string>>({});

  // Materials
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  // Time
  const [manualMinutes, setManualMinutes] = useState("");

  const briefFilledCount = briefFields.filter(f => (task as any)[f.key]).length;

  function openBriefEditor() {
    const form: Record<string, string> = {};
    briefFields.forEach(f => { form[f.key] = (task as any)[f.key] || ""; });
    setBriefForm(form);
    setBriefOpen(true);
  }

  async function saveBrief() {
    const { error } = await supabase.from("tasks").update(briefForm as any).eq("id", taskId);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["task", taskId] });
    setBriefOpen(false);
    toast.success("Brief zapisany");
  }

  async function addChecklist() {
    if (!newChecklistName.trim()) return;
    const { error } = await supabase.from("checklists").insert({ task_id: taskId, title: newChecklistName });
    if (error) { toast.error(error.message); return; }
    setNewChecklistName("");
    queryClient.invalidateQueries({ queryKey: ["checklists", taskId] });
  }

  async function addChecklistItem(checklistId: string) {
    const text = newChecklistItemTexts[checklistId]?.trim();
    if (!text) return;
    await supabase.from("checklist_items").insert({ checklist_id: checklistId, title: text });
    queryClient.invalidateQueries({ queryKey: ["checklists", taskId] });
    setNewChecklistItemTexts(prev => ({ ...prev, [checklistId]: "" }));
  }

  async function toggleChecklistItem(itemId: string, completed: boolean) {
    await supabase.from("checklist_items").update({ is_completed: !completed }).eq("id", itemId);
    queryClient.invalidateQueries({ queryKey: ["checklists", taskId] });
  }

  async function uploadFile(file: File) {
    if (!user) return;
    const filePath = `${taskId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("task_materials").upload(filePath, file);
    if (uploadError) { toast.error(uploadError.message); return; }
    const { data: urlData } = supabase.storage.from("task_materials").getPublicUrl(filePath);
    await supabase.from("task_materials").insert({ task_id: taskId, name: file.name, type: "file", url: urlData.publicUrl, uploaded_by: user.id });
    queryClient.invalidateQueries({ queryKey: ["materials", taskId] });
    toast.success("Plik przesłany");
  }

  async function addLinkMaterial() {
    if (!linkName.trim() || !linkUrl.trim() || !user) return;
    await supabase.from("task_materials").insert({ task_id: taskId, name: linkName, type: "link", url: linkUrl, uploaded_by: user.id });
    queryClient.invalidateQueries({ queryKey: ["materials", taskId] });
    setLinkDialogOpen(false); setLinkName(""); setLinkUrl("");
    toast.success("Link dodany");
  }

  async function deleteMaterial(materialId: string) {
    await supabase.from("task_materials").delete().eq("id", materialId);
    queryClient.invalidateQueries({ queryKey: ["materials", taskId] });
  }

  async function toggleMaterialVisibility(materialId: string, visible: boolean) {
    const { error } = await supabase.from("task_materials").update({ is_visible_to_client: visible } as any).eq("id", materialId);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["materials", taskId] });
  }

  function logManualTime() {
    const mins = parseInt(manualMinutes);
    if (isNaN(mins) || mins <= 0) { toast.error("Podaj poprawną liczbę minut"); return; }
    onLogTime(mins);
    setManualMinutes("");
  }

  const filteredMats = (isPreviewMode || isClient) ? (materials || []).filter((m: any) => m.is_visible_to_client) : (materials || []);

  return (
    <>
      <Tabs defaultValue="description" className="h-full flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-0 h-auto flex-wrap">
          <TabsTrigger value="description" className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2">
            Opis
          </TabsTrigger>
          {!isClient && (
            <TabsTrigger value="plan" className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2">
              Plan działania
            </TabsTrigger>
          )}
          <TabsTrigger value="materials" className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2">
            Materiały ({filteredMats.length})
          </TabsTrigger>
          {!isPreviewMode && !isClient && (
            <TabsTrigger value="time" className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2">
              Czas pracy
            </TabsTrigger>
          )}
          {!isPreviewMode && !isClient && (
            <TabsTrigger value="history" className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2">
              Raport i Historia
            </TabsTrigger>
          )}
        </TabsList>

        <div className="flex-1 overflow-y-auto min-h-0 p-3">
          {/* Tab 1: Description + Brief */}
          <TabsContent value="description" className="mt-0 space-y-4">
            <DescriptionCard
              description={task.description}
              taskId={taskId}
              canEdit={canEditInline}
              onSaved={() => queryClient.invalidateQueries({ queryKey: ["task", taskId] })}
            />

            {/* Brief */}
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
                    <span className={`text-xs font-semibold ${briefFilledCount === 0 ? "text-destructive" : briefFilledCount < briefFields.length ? "text-amber-600" : "text-green-600"}`}>
                      {briefFilledCount}/{briefFields.length}
                    </span>
                  </div>
                )}
                {!isClient && !isPreviewMode && briefFilledCount === 0 && (
                  <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">
                    <AlertTriangle className="h-3.5 w-3.5" />Brief jest pusty!
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

            {/* Corrections */}
            {corrections && corrections.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Poprawki ({corrections.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {corrections.map((c: any) => (
                    <div key={c.id} className={`rounded-lg border p-3 space-y-1 ${c.severity === "critical" ? "border-destructive/40 bg-destructive/5" : "border-amber-400/40 bg-amber-500/5"}`}>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[9px] font-bold ${c.severity === "critical" ? "bg-destructive text-destructive-foreground" : "bg-amber-500/15 text-amber-700 border-amber-400/40"}`}>
                          {c.severity === "critical" ? "🔴 KRYTYCZNE" : "Drobne"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground ml-auto">{new Date(c.created_at).toLocaleString("pl-PL")}</span>
                      </div>
                      <p className="text-sm">{c.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab 2: Checklists */}
          <TabsContent value="plan" className="mt-0 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Listy kontrolne</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {checklists && checklists.length > 0 && checklists.map((cl: any) => (
                  <div key={cl.id} className="space-y-2">
                    <p className="text-sm font-medium">{cl.title}</p>
                    {(cl.items || []).map((item: any) => (
                      <div key={item.id} className="flex items-center gap-2 pl-2">
                        <Checkbox checked={item.is_completed} disabled={item.is_na || isPreviewMode || isClient}
                          onCheckedChange={() => !isPreviewMode && !isClient && toggleChecklistItem(item.id, item.is_completed)} />
                        <span className={`text-sm ${item.is_completed ? "line-through text-muted-foreground" : ""} ${item.is_na ? "text-muted-foreground italic" : ""}`}>
                          {item.title}
                        </span>
                        {item.is_na && <Badge variant="outline" className="text-[9px] h-4">N/A</Badge>}
                      </div>
                    ))}
                    {!isClient && (
                      <div className="flex gap-2 pl-2">
                        <Input placeholder="Dodaj element..." value={newChecklistItemTexts[cl.id] || ""}
                          onChange={e => setNewChecklistItemTexts(prev => ({ ...prev, [cl.id]: e.target.value }))}
                          onKeyDown={e => e.key === "Enter" && addChecklistItem(cl.id)} className="text-sm h-7" />
                        <Button size="sm" variant="ghost" onClick={() => addChecklistItem(cl.id)} className="h-7 w-7 p-0"><Plus className="h-3 w-3" /></Button>
                      </div>
                    )}
                  </div>
                ))}
                {(!checklists || checklists.length === 0) && <p className="text-sm text-muted-foreground">Brak list kontrolnych.</p>}
                {!isClient && (
                  <>
                    <Separator />
                    <div className="flex gap-2">
                      <Input placeholder="Nazwa nowej listy..." value={newChecklistName}
                        onChange={e => setNewChecklistName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addChecklist()} className="text-sm h-8" />
                      <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8" onClick={addChecklist}><Plus className="h-3 w-3" />Dodaj</Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Materials */}
          <TabsContent value="materials" className="mt-0 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Materiały</CardTitle>
                  {!isPreviewMode && !isClient && (
                    <div className="flex gap-1.5">
                      <input ref={fileInputRef} type="file" className="hidden" onChange={e => { if (e.target.files?.[0]) uploadFile(e.target.files[0]); e.target.value = ""; }} />
                      <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => fileInputRef.current?.click()}><Upload className="h-3 w-3" />Plik</Button>
                      <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => setLinkDialogOpen(true)}><LinkIcon className="h-3 w-3" />Link</Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {filteredMats.length > 0 ? (
                  <div className="space-y-2">
                    {filteredMats.map((m: any) => (
                      <div key={m.id} className="flex items-center gap-2 p-2 rounded-md border bg-muted/30 group">
                        {m.type === "link" ? <LinkIcon className="h-4 w-4 text-blue-500" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
                        <div className="flex-1 min-w-0">
                          {m.url ? (
                            <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-sm truncate block hover:underline text-primary">{m.name}</a>
                          ) : (
                            <span className="text-sm truncate block">{m.name}</span>
                          )}
                          <span className="text-[10px] text-muted-foreground">{m.profiles?.full_name} • {new Date(m.created_at).toLocaleDateString("pl-PL")}</span>
                        </div>
                        {!isPreviewMode && !isClient && (
                          <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                            <Checkbox checked={!!m.is_visible_to_client} onCheckedChange={(checked) => toggleMaterialVisibility(m.id, !!checked)} className="h-3.5 w-3.5" />
                            <Eye className={`h-3.5 w-3.5 ${m.is_visible_to_client ? "text-emerald-600" : "text-muted-foreground/40"}`} />
                          </label>
                        )}
                        {!isPreviewMode && !isClient && (
                          <button onClick={() => deleteMaterial(m.id)} className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Brak materiałów.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Time */}
          <TabsContent value="time" className="mt-0 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Czas pracy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Łącznie</p>
                    <p className="text-lg font-bold">{formatDuration(totalLogged)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Szacowany</p>
                    <p className="text-lg font-bold">{task.estimated_time ? formatDuration(task.estimated_time) : "—"}</p>
                  </div>
                </div>
                {task.estimated_time > 0 && <Progress value={Math.min((totalLogged / task.estimated_time) * 100, 100)} className="h-2" />}
                <div className="flex flex-wrap gap-1.5">
                  {[5, 15, 30, 60, 120].map(m => (
                    <Button key={m} variant="outline" size="sm" className="text-xs h-7" onClick={() => onLogTime(m)}>
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
                  <span className="text-lg font-mono font-bold">{formatTimer(timer.elapsed)}</span>
                  {!timer.isRunning ? (
                    <Button size="sm" variant="outline" onClick={() => timer.start()} className="gap-1.5 text-xs">
                      <Play className="h-3 w-3" />Uruchom stoper
                    </Button>
                  ) : (
                    <Button size="sm" variant="destructive" onClick={onStopTimer} className="gap-1.5 text-xs">
                      <Timer className="h-3 w-3" />Zatrzymaj
                    </Button>
                  )}
                </div>
                {timeLogs && timeLogs.length > 0 && (
                  <>
                    <Separator />
                    <p className="text-xs font-semibold text-muted-foreground">Historia</p>
                    <div className="space-y-2">
                      {timeLogs.map((l: any) => (
                        <div key={l.id} className="flex items-center gap-2 text-sm">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                              {(l.profiles?.full_name)?.split(" ").map((n: string) => n[0]).join("") || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{l.profiles?.full_name}</span>
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
          </TabsContent>

          {/* Tab 5: History & Report */}
          <TabsContent value="history" className="mt-0 space-y-4">
            {/* Estimation vs Reality */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Czas: Estymacja vs Rzeczywistość</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Estymacja</p>
                    <p className="text-xl font-bold">{task.estimated_time ? formatDuration(task.estimated_time) : "—"}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Rzeczywistość</p>
                    <p className="text-xl font-bold">{formatDuration(totalLogged)}</p>
                  </div>
                </div>
                {task.estimated_time > 0 && (
                  <div className="mt-3">
                    <Progress value={Math.min((totalLogged / task.estimated_time) * 100, 100)} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1 text-center">
                      {Math.round((totalLogged / task.estimated_time) * 100)}% estymacji
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <StatusTimeline
              statusHistory={statusHistory || []}
              currentStatus={task?.status || "new"}
              taskId={taskId}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* Brief Edit Dialog */}
      <Dialog open={briefOpen} onOpenChange={setBriefOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="px-1">
            <DialogTitle>Edytuj brief zadania</DialogTitle>
            <DialogDescription>Uzupełnij pola briefu.</DialogDescription>
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
            <DialogDescription>Podaj nazwę i adres URL.</DialogDescription>
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
    </>
  );
}
