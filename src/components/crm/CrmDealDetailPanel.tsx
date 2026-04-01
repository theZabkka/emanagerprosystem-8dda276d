import { useState, useEffect } from "react";
import { format, isPast } from "date-fns";
import { pl } from "date-fns/locale";
import { X, Send, Tag, AlertTriangle, Pencil, Trash2, Building2, ExternalLink } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useCrmDealComments, useCrmDealLabels, useCrmLabels, useCrmMutations, type CrmDeal } from "@/hooks/useCrmData";

interface Props {
  deal: CrmDeal | null;
  open: boolean;
  onClose: () => void;
  readOnly?: boolean;
}

export function CrmDealDetailPanel({ deal, open, onClose, readOnly = false }: Props) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { data: staff } = useStaffMembers();
  const { data: comments = [] } = useCrmDealComments(deal?.id ?? null);
  const { data: dealLabels = [] } = useCrmDealLabels(deal?.id ?? null);
  const { data: allLabels = [] } = useCrmLabels();
  const mutations = useCrmMutations();

  // Clients list for assignment
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list-crm"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").order("name");
      return data || [];
    },
  });

  const [commentText, setCommentText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", due_date: "", due_time: "", assigned_to: "", client_id: "",
  });

  // Reset editing state when deal changes
  useEffect(() => {
    setEditing(false);
    setEditingCommentId(null);
  }, [deal?.id]);

  const isOverdue = deal?.due_date ? isPast(new Date(deal.due_date)) : false;

  const startEdit = () => {
    if (!deal) return;
    const dueDate = deal.due_date ? new Date(deal.due_date) : null;
    setForm({
      title: deal.title,
      description: deal.description || "",
      due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : "",
      due_time: dueDate ? format(dueDate, "HH:mm") : "",
      assigned_to: deal.assigned_to || "",
      client_id: deal.client_id || "",
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!deal || !form.title.trim()) {
      toast.error("Tytuł jest wymagany");
      return;
    }
    setSaving(true);
    try {
      const dueDateCombined = form.due_date
        ? form.due_time
          ? `${form.due_date}T${form.due_time}:00`
          : `${form.due_date}T23:59:00`
        : null;

      mutations.updateDeal.mutate(
        {
          id: deal.id,
          title: form.title.trim(),
          description: form.description.trim() || null,
          due_date: dueDateCombined,
          assigned_to: form.assigned_to || null,
          client_id: form.client_id || null,
        },
        {
          onSuccess: () => {
            toast.success("Karta zaktualizowana");
            setEditing(false);
            setSaving(false);
          },
          onError: (err: any) => {
            toast.error("Błąd zapisu: " + (err.message || "Nieznany błąd"));
            setSaving(false);
          },
        }
      );
    } catch (err: any) {
      toast.error("Błąd zapisu: " + (err.message || "Nieznany błąd"));
      setSaving(false);
    }
  };

  const handleAddComment = () => {
    if (!deal || !commentText.trim() || !session?.user.id) return;
    mutations.addComment.mutate(
      { deal_id: deal.id, user_id: session.user.id, content: commentText.trim() },
      { onSuccess: () => toast.success("Komentarz dodany") }
    );
    setCommentText("");
  };

  const handleUpdateComment = (id: string) => {
    if (!editCommentText.trim()) return;
    mutations.updateComment.mutate(
      { id, content: editCommentText.trim() },
      {
        onSuccess: () => {
          toast.success("Komentarz zaktualizowany");
          setEditingCommentId(null);
        },
      }
    );
  };

  const handleDeleteComment = (id: string) => {
    mutations.deleteComment.mutate(id, {
      onSuccess: () => toast.success("Komentarz usunięty"),
    });
  };

  const dealLabelIds = new Set(dealLabels.map((l) => l.id));

  if (!deal) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b border-border">
          <SheetTitle className="text-lg">{deal.title}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {/* Overdue alert */}
            {isOverdue && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-destructive">Termin minął!</p>
                  <p className="text-sm text-destructive/80">
                    Karta „{deal.title}" miała termin:{" "}
                    <strong>{format(new Date(deal.due_date!), "d MMMM yyyy, HH:mm", { locale: pl })}</strong>
                  </p>
                </div>
              </div>
            )}

            {/* Edit / View mode */}
            {editing && !readOnly ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tytuł *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Opis</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Data terminu</Label>
                    <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Godzina</Label>
                    <Input type="time" value={form.due_time} onChange={(e) => setForm({ ...form, due_time: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Przypisana osoba</Label>
                  <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v === "_none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Wybierz..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Brak</SelectItem>
                      {(staff || []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.full_name || "Bez nazwy"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Klient</Label>
                  <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v === "_none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Wybierz klienta..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Brak</SelectItem>
                      {clients.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveEdit} size="sm" disabled={saving}>
                    {saving ? "Zapisywanie..." : "Zapisz"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>Anuluj</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{deal.description || "Brak opisu"}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {deal.due_date && (
                    <span>
                      Termin:{" "}
                      <strong className={cn("text-foreground", isOverdue && "text-destructive")}>
                        {format(new Date(deal.due_date), "d MMM yyyy, HH:mm", { locale: pl })}
                      </strong>
                    </span>
                  )}
                  <span>Osoba: <strong className="text-foreground">{deal.profiles?.full_name || "—"}</strong></span>
                </div>
                {/* Client link */}
                {deal.clients?.name && (
                  <div className="flex items-center gap-2 text-xs">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <button
                      onClick={() => { onClose(); navigate(`/clients/${deal.client_id}`); }}
                      className="text-primary hover:underline font-medium flex items-center gap-1"
                    >
                      {deal.clients.name}
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                )}
                {!readOnly && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={startEdit}>Edytuj</Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => {
                        mutations.archiveDeal.mutate(deal.id, {
                          onSuccess: () => { toast.success("Karta zarchiwizowana"); onClose(); },
                        });
                      }}
                    >
                      Archiwizuj
                    </Button>
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
                  <Badge
                    key={l.id}
                    className="text-[10px] text-white cursor-pointer"
                    style={{ backgroundColor: l.color }}
                    onClick={() => !readOnly && mutations.toggleLabel.mutate({ deal_id: deal.id, label_id: l.id, attach: false })}
                  >
                    {l.name} {!readOnly && "×"}
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
                          onClick={() => mutations.toggleLabel.mutate({ deal_id: deal.id, label_id: l.id, attach: !dealLabelIds.has(l.id) })}
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
              {comments.map((c) => (
                <div key={c.id} className="bg-muted/50 rounded-lg p-3 space-y-1">
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
                    {!readOnly && c.user_id === session?.user.id && (
                      <div className="flex gap-0.5">
                        <button
                          onClick={() => { setEditingCommentId(c.id); setEditCommentText(c.content); }}
                          className="p-1 rounded hover:bg-accent text-muted-foreground"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="p-1 rounded hover:bg-destructive/10 text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  {editingCommentId === c.id ? (
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={editCommentText}
                        onChange={(e) => setEditCommentText(e.target.value)}
                        className="text-sm"
                        onKeyDown={(e) => e.key === "Enter" && handleUpdateComment(c.id)}
                      />
                      <Button size="sm" onClick={() => handleUpdateComment(c.id)}>Zapisz</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingCommentId(null)}>Anuluj</Button>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground">{c.content}</p>
                  )}
                </div>
              ))}
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
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
