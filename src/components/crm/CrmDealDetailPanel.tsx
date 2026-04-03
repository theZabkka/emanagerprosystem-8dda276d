import { useState } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Send, Tag, ExternalLink, Pencil, Trash2, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCrmDealComments, useCrmDealLabels, useCrmLabels, useCrmMutations, type CrmDeal } from "@/hooks/useCrmData";

/** Converts a datetime-local value (e.g. "2026-04-10T14:30") to an ISO string
 *  that preserves the user's local timezone offset, avoiding the UTC-shift bug. */
function localDatetimeToISO(dtLocal: string): string {
  const d = new Date(dtLocal);
  if (isNaN(d.getTime())) return dtLocal;
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, "0");
  return (
    d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
    "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":00" +
    sign + pad(off / 60) + ":" + pad(off % 60)
  );
}

const NONE_SENTINEL = "__none__";

interface Props {
  deal: CrmDeal | null;
  open: boolean;
  onClose: () => void;
  readOnly?: boolean;
}

export function CrmDealDetailPanel({ deal, open, onClose, readOnly = false }: Props) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { currentRole } = useRole();
  const { data: staff } = useStaffMembers();
  const { data: comments = [] } = useCrmDealComments(deal?.id ?? null);
  const { data: dealLabels = [] } = useCrmDealLabels(deal?.id ?? null);
  const { data: allLabels = [] } = useCrmLabels();
  const { updateDeal, addComment, updateComment, deleteComment, toggleLabel, archiveDeal } = useCrmMutations();

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list-simple"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name").order("name");
      if (error) throw error;
      return data as Array<{ id: string; name: string }>;
    },
  });

  const [commentText, setCommentText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [form, setForm] = useState({
    title: "", description: "", due_date: "", assigned_to: "", client_id: "",
  });

  const isAdmin = currentRole === "superadmin" || currentRole === "boss" || currentRole === "koordynator";
  const currentUserId = session?.user.id;

  const startEdit = () => {
    if (!deal) return;
    let dueDateLocal = "";
    if (deal.due_date) {
      try {
        dueDateLocal = format(new Date(deal.due_date), "yyyy-MM-dd'T'HH:mm");
      } catch {
        dueDateLocal = deal.due_date.slice(0, 16);
      }
    }
    setForm({
      title: deal.title,
      description: deal.description || "",
      due_date: dueDateLocal,
      assigned_to: deal.assigned_to || "",
      client_id: deal.client_id || "",
    });
    setEditing(true);
  };

  const saveEdit = () => {
    if (!deal) return;
    if (!form.title.trim()) {
      toast.error("Tytuł nie może być pusty");
      return;
    }
    try {
      updateDeal.mutate({
        id: deal.id,
        title: form.title.trim(),
        description: form.description || null,
        due_date: form.due_date ? localDatetimeToISO(form.due_date) : null,
        assigned_to: form.assigned_to || null,
        client_id: form.client_id || null,
      } as any, {
        onSuccess: () => { toast.success("Karta zaktualizowana"); setEditing(false); },
        onError: (err: any) => toast.error("Błąd zapisu: " + (err?.message || "Nieznany błąd")),
      });
    } catch (err: any) {
      toast.error("Wystąpił błąd: " + (err?.message || "Nieznany błąd"));
    }
  };

  const handleAddComment = () => {
    if (!deal || !commentText.trim() || !currentUserId) return;
    addComment.mutate({ deal_id: deal.id, user_id: currentUserId, content: commentText.trim() });
    setCommentText("");
  };

  const handleEditComment = (id: string) => {
    if (!editingCommentText.trim()) return;
    updateComment.mutate({ id, content: editingCommentText.trim() }, {
      onSuccess: () => { setEditingCommentId(null); toast.success("Komentarz zaktualizowany"); },
      onError: (err: any) => toast.error("Błąd: " + (err?.message || "Nieznany")),
    });
  };

  const handleDeleteComment = (id: string) => {
    deleteComment.mutate(id, {
      onSuccess: () => toast.success("Komentarz usunięty"),
      onError: (err: any) => toast.error("Błąd: " + (err?.message || "Nieznany")),
    });
  };

  const dealLabelIds = new Set(dealLabels.map((l) => l.id));

  if (!deal) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col h-full max-h-screen">
        <SheetHeader className="p-4 pb-3 border-b border-border shrink-0">
          <SheetTitle className="text-lg truncate">{deal.title}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/50 [&::-webkit-scrollbar-track]:bg-transparent">
          <div className="space-y-4">
            {editing ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Tytuł</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Opis</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="min-h-[60px] max-h-[120px] resize-y" />
                </div>
                <div className="space-y-2">
                  <Label>Termin (data i godzina)</Label>
                  <Input type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Przypisana osoba</Label>
                  <Select value={form.assigned_to || NONE_SENTINEL} onValueChange={(v) => setForm({ ...form, assigned_to: v === NONE_SENTINEL ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Wybierz..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SENTINEL}>Brak</SelectItem>
                      {(staff || []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.full_name || "Bez nazwy"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Klient</Label>
                  <Select value={form.client_id || NONE_SENTINEL} onValueChange={(v) => setForm({ ...form, client_id: v === NONE_SENTINEL ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Wybierz klienta..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SENTINEL}>Brak</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveEdit} size="sm" disabled={updateDeal.isPending}>
                    {updateDeal.isPending ? "Zapisywanie..." : "Zapisz"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Anuluj</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{deal.description || "Brak opisu"}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {deal.due_date && (
                    <span>
                      Termin:{" "}
                      <strong className="text-foreground">
                        {format(new Date(deal.due_date), "d MMM yyyy, HH:mm", { locale: pl })}
                      </strong>
                    </span>
                  )}
                  <span>Osoba: <strong className="text-foreground">{deal.profiles?.full_name || "—"}</strong></span>
                  <span className="flex items-center gap-1">
                    Klient:{" "}
                    {deal.clients?.name ? (
                      <button
                        className="text-primary hover:underline font-semibold inline-flex items-center gap-0.5"
                        onClick={() => { onClose(); navigate(`/clients/${deal.clients!.id}`); }}
                      >
                        {deal.clients.name}
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    ) : (
                      <strong className="text-foreground">—</strong>
                    )}
                  </span>
                </div>
                {!readOnly && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={startEdit}>Edytuj</Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => { archiveDeal.mutate(deal.id); onClose(); }}>Archiwizuj</Button>
                  </div>
                )}
              </div>
            )}

            {/* Labels */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Etykiety</Label>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {dealLabels.map((l) => (
                  <Badge key={l.id} className={cn("text-[10px] text-white", !readOnly && "cursor-pointer")} style={{ backgroundColor: l.color }}
                    onClick={() => !readOnly && toggleLabel.mutate({ deal_id: deal.id, label_id: l.id, attach: false })}>
                    {l.name}{!readOnly && " ×"}
                  </Badge>
                ))}
                {!readOnly && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-5 text-[10px] px-2">+ Dodaj</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2" align="start">
                      {allLabels.map((l) => (
                        <button
                          key={l.id}
                          className="flex items-center gap-2 w-full px-2 py-1 rounded text-xs hover:bg-accent"
                          onClick={() => toggleLabel.mutate({ deal_id: deal.id, label_id: l.id, attach: !dealLabelIds.has(l.id) })}
                        >
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                          {l.name}
                          {dealLabelIds.has(l.id) && <span className="ml-auto text-primary">✓</span>}
                        </button>
                      ))}
                      {allLabels.length === 0 && <p className="text-xs text-muted-foreground p-2">Brak etykiet</p>}
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Komentarze</Label>
              {comments.length === 0 && <p className="text-xs text-muted-foreground">Brak komentarzy</p>}
              {comments.map((c) => {
                const canModify = c.user_id === currentUserId || isAdmin;
                const isEditingThis = editingCommentId === c.id;
                return (
                  <div key={c.id} className="bg-muted/50 rounded-lg p-3 space-y-1 group">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[9px] bg-primary text-primary-foreground">
                          {(c.profiles?.full_name || "U").charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium">{c.profiles?.full_name || "Użytkownik"}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {c.created_at ? format(new Date(c.created_at), "d MMM HH:mm", { locale: pl }) : ""}
                      </span>
                      {canModify && !isEditingThis && (
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                            onClick={() => { setEditingCommentId(c.id); setEditingCommentText(c.content); }}
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteComment(c.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    {isEditingThis ? (
                      <div className="flex gap-1.5 items-center mt-1">
                        <Input
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                          className="text-sm h-8"
                          autoFocus
                          onKeyDown={(e) => e.key === "Enter" && handleEditComment(c.id)}
                        />
                        <button className="p-1 rounded hover:bg-accent text-primary" onClick={() => handleEditComment(c.id)}>
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button className="p-1 rounded hover:bg-accent text-muted-foreground" onClick={() => setEditingCommentId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-foreground">{c.content}</p>
                    )}
                  </div>
                );
              })}
              {!readOnly && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Dodaj komentarz..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                    className="text-sm"
                  />
                  <Button size="icon" variant="ghost" onClick={handleAddComment} disabled={!commentText.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
