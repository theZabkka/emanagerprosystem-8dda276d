import { useState } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { X, Send, Tag } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { useCrmDealComments, useCrmDealLabels, useCrmLabels, useCrmMutations, type CrmDeal } from "@/hooks/useCrmData";

interface Props {
  deal: CrmDeal | null;
  open: boolean;
  onClose: () => void;
}

export function CrmDealDetailPanel({ deal, open, onClose }: Props) {
  const { session } = useAuth();
  const { data: staff } = useStaffMembers();
  const { data: comments = [] } = useCrmDealComments(deal?.id ?? null);
  const { data: dealLabels = [] } = useCrmDealLabels(deal?.id ?? null);
  const { data: allLabels = [] } = useCrmLabels();
  const { updateDeal, addComment, toggleLabel, archiveDeal } = useCrmMutations();

  const [commentText, setCommentText] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", due_date: "", assigned_to: "" });

  const startEdit = () => {
    if (!deal) return;
    setForm({
      title: deal.title,
      description: deal.description || "",
      priority: deal.priority,
      due_date: deal.due_date || "",
      assigned_to: deal.assigned_to || "",
    });
    setEditing(true);
  };

  const saveEdit = () => {
    if (!deal) return;
    updateDeal.mutate({ id: deal.id, ...form });
    setEditing(false);
  };

  const handleAddComment = () => {
    if (!deal || !commentText.trim() || !session?.user.id) return;
    addComment.mutate({ deal_id: deal.id, user_id: session.user.id, content: commentText.trim() });
    setCommentText("");
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
            {/* Edit / View mode */}
            {editing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tytuł</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Opis</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Priorytet</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">Krytyczny</SelectItem>
                        <SelectItem value="high">Wysoki</SelectItem>
                        <SelectItem value="medium">Średni</SelectItem>
                        <SelectItem value="low">Niski</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Termin</Label>
                    <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Przypisana osoba</Label>
                  <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                    <SelectTrigger><SelectValue placeholder="Wybierz..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Brak</SelectItem>
                      {(staff || []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.full_name || "Bez nazwy"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveEdit} size="sm">Zapisz</Button>
                  <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Anuluj</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{deal.description || "Brak opisu"}</p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Priorytet: <strong className="text-foreground">{deal.priority}</strong></span>
                  {deal.due_date && <span>Termin: <strong className="text-foreground">{format(new Date(deal.due_date), "d MMM yyyy", { locale: pl })}</strong></span>}
                  <span>Osoba: <strong className="text-foreground">{deal.profiles?.full_name || "—"}</strong></span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={startEdit}>Edytuj</Button>
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => { archiveDeal.mutate(deal.id); onClose(); }}>Archiwizuj</Button>
                </div>
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
                  <Badge key={l.id} className="text-[10px] text-white cursor-pointer" style={{ backgroundColor: l.color }}
                    onClick={() => toggleLabel.mutate({ deal_id: deal.id, label_id: l.id, attach: false })}>
                    {l.name} ×
                  </Badge>
                ))}
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
                  </div>
                  <p className="text-sm text-foreground">{c.content}</p>
                </div>
              ))}
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
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
