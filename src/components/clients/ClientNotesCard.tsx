import { useState } from "react";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StickyNote, Plus, Pin, FileText } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";

interface ClientNote {
  id: string;
  client_id: string;
  author_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
}

interface ClientNotesCardProps {
  clientId: string;
  onShowAll: () => void;
}

function getInitials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ClientNotesCard({ clientId, onShowAll }: ClientNotesCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const queryKey = ["client-notes", clientId];

  const { data: notes = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_notes" as any)
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ClientNote[];
    },
    enabled: !!clientId,
  });

  

  // ...

  const { data: profiles = [] } = useStaffMembers();

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  // Sort: pinned first, then by created_at desc
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const displayNotes = sortedNotes.slice(0, 5);

  const handleAddNote = async () => {
    if (!newNote.trim() || !user) return;
    setSubmitting(true);

    const optimisticNote: ClientNote = {
      id: crypto.randomUUID(),
      client_id: clientId,
      author_id: user.id,
      content: newNote.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_pinned: false,
    };

    queryClient.setQueryData<ClientNote[]>(queryKey, (old) => [optimisticNote, ...(old || [])]);
    setNewNote("");
    setShowAddDialog(false);

    try {
      const { error } = await (supabase.from("client_notes" as any) as any).insert({
        client_id: clientId,
        author_id: user.id,
        content: optimisticNote.content,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey });
      toast.success("Notatka dodana");
    } catch {
      queryClient.setQueryData<ClientNote[]>(queryKey, (old) => (old || []).filter((n) => n.id !== optimisticNote.id));
      toast.error("Nie udało się dodać notatki");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePin = async (noteId: string, currentlyPinned: boolean) => {
    const prev = queryClient.getQueryData<ClientNote[]>(queryKey);

    // Optimistic: unpin all others, toggle this one
    queryClient.setQueryData<ClientNote[]>(queryKey, (old) =>
      (old || []).map((n) => ({
        ...n,
        is_pinned: n.id === noteId ? !currentlyPinned : false,
      })),
    );

    try {
      // First unpin all notes for this client
      if (!currentlyPinned) {
        await (supabase.from("client_notes" as any) as any)
          .update({ is_pinned: false })
          .eq("client_id", clientId)
          .eq("is_pinned", true);
      }
      // Then set the target note
      await (supabase.from("client_notes" as any) as any).update({ is_pinned: !currentlyPinned }).eq("id", noteId);

      queryClient.invalidateQueries({ queryKey });
      toast.success(currentlyPinned ? "Notatka odpięta" : "Notatka przypięta");
    } catch {
      queryClient.setQueryData(queryKey, prev);
      toast.error("Nie udało się zmienić przypięcia");
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-muted-foreground" />
              Notatki o kliencie
              {notes.length > 0 && <span className="text-xs font-normal text-muted-foreground">({notes.length})</span>}
            </CardTitle>
            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Dodaj
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse h-16 bg-muted rounded-md" />
              ))}
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Brak notatek</p>
              <p className="text-xs text-muted-foreground mt-1">Kliknij (+), aby dodać pierwszą informację.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayNotes.map((note) => {
                const author = note.author_id ? profileMap.get(note.author_id) : null;
                const timeAgo = formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: pl });

                return (
                  <div
                    key={note.id}
                    className={`group relative rounded-lg border p-3 transition-colors ${
                      note.is_pinned
                        ? "bg-amber-50/60 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                        {author?.avatar_url && <AvatarImage src={author.avatar_url} />}
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {getInitials(author?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium truncate">{author?.full_name || "Nieznany"}</span>
                          <span className="text-xs text-muted-foreground">{timeAgo}</span>
                          {note.is_pinned && (
                            <Pin className="h-3 w-3 text-amber-600 dark:text-amber-400 fill-current" />
                          )}
                        </div>
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap line-clamp-2 leading-relaxed">
                          {note.content}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-6 w-6 shrink-0 transition-opacity ${
                          note.is_pinned ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`}
                        onClick={() => handleTogglePin(note.id, note.is_pinned)}
                        title={note.is_pinned ? "Odepnij" : "Przypnij"}
                      >
                        <Pin
                          className={`h-3.5 w-3.5 ${note.is_pinned ? "text-amber-600 fill-current" : "text-muted-foreground"}`}
                        />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
        {notes.length > 0 && (
          <CardFooter className="pt-0 pb-3 px-6">
            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={onShowAll}>
              Zobacz wszystkie notatki ({notes.length})
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Add Note Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Dodaj notatkę</DialogTitle>
          </DialogHeader>
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Wpisz notatkę, ustalenia ze spotkania..."
            className="min-h-[120px] resize-none"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Anuluj
            </Button>
            <Button onClick={handleAddNote} disabled={!newNote.trim() || submitting}>
              Dodaj notatkę
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
