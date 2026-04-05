import { useState, useRef } from "react";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Send, Pin } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
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

interface ClientNotesTimelineProps {
  clientId: string;
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

export function ClientNotesTimeline({ clientId }: ClientNotesTimelineProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const queryKey = ["client-notes", clientId];

  // Fetch notes using raw rpc-style query to bypass missing type
  const { data: notes = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_notes")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ClientNote[];
    },
    enabled: !!clientId,
  });

  // Fetch profiles for author names
  

  // ...

  const { data: profiles = [] } = useStaffMembers();

  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const isStaff = profile?.role && ["superadmin", "boss", "koordynator"].includes(profile.role);

  const canManageNote = (authorId: string | null) => {
    if (!user) return false;
    if (authorId === user.id) return true;
    return !!isStaff;
  };

  // Add note with optimistic update
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

    try {
      const { error } = await supabase.from("client_notes").insert({
        client_id: clientId,
        author_id: user.id,
        content: optimisticNote.content,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey });
    } catch {
      queryClient.setQueryData<ClientNote[]>(queryKey, (old) => (old || []).filter((n) => n.id !== optimisticNote.id));
      toast.error("Nie udało się dodać notatki");
    } finally {
      setSubmitting(false);
    }
  };

  // Update note
  const handleUpdateNote = async (noteId: string) => {
    if (!editContent.trim()) return;

    const prev = queryClient.getQueryData<ClientNote[]>(queryKey);
    queryClient.setQueryData<ClientNote[]>(queryKey, (old) =>
      (old || []).map((n) =>
        n.id === noteId ? { ...n, content: editContent.trim(), updated_at: new Date().toISOString() } : n,
      ),
    );
    setEditingId(null);

    try {
      const { error } = await supabase.from("client_notes")
        .update({ content: editContent.trim(), updated_at: new Date().toISOString() })
        .eq("id", noteId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey });
      toast.success("Notatka zaktualizowana");
    } catch {
      queryClient.setQueryData(queryKey, prev);
      toast.error("Nie udało się zaktualizować notatki");
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    const prev = queryClient.getQueryData<ClientNote[]>(queryKey);
    queryClient.setQueryData<ClientNote[]>(queryKey, (old) => (old || []).filter((n) => n.id !== noteId));

    try {
      const { error } = await supabase.from("client_notes").delete().eq("id", noteId);
      if (error) throw error;
      toast.success("Notatka usunięta");
    } catch {
      queryClient.setQueryData(queryKey, prev);
      toast.error("Nie udało się usunąć notatki");
    }
  };

  // Toggle pin
  const handleTogglePin = async (noteId: string, currentlyPinned: boolean) => {
    const prev = queryClient.getQueryData<ClientNote[]>(queryKey);
    queryClient.setQueryData<ClientNote[]>(queryKey, (old) =>
      (old || []).map((n) => ({
        ...n,
        is_pinned: n.id === noteId ? !currentlyPinned : false,
      })),
    );
    try {
      if (!currentlyPinned) {
        await (supabase.from("client_notes" as any) as any)
          .update({ is_pinned: false })
          .eq("client_id", clientId)
          .eq("is_pinned", true);
      }
      await (supabase.from("client_notes" as any) as any).update({ is_pinned: !currentlyPinned }).eq("id", noteId);
      queryClient.invalidateQueries({ queryKey });
    } catch {
      queryClient.setQueryData(queryKey, prev);
      toast.error("Nie udało się zmienić przypięcia");
    }
  };

  // Sort: pinned first, then by date
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Auto-resize textarea
  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  return (
    <div className="space-y-4">
      {/* Input section */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Textarea
            value={newNote}
            onChange={(e) => {
              setNewNote(e.target.value);
              autoResize(e.target);
            }}
            placeholder="Dodaj notatkę, podsumowanie spotkania lub ustalenia..."
            className="min-h-[80px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleAddNote();
              }
            }}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Ctrl+Enter aby wysłać</span>
            <Button onClick={handleAddNote} disabled={!newNote.trim() || submitting} size="sm">
              <Send className="h-4 w-4 mr-1.5" />
              Dodaj notatkę
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-24" />
            </Card>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            Brak notatek — dodaj pierwszą notatkę powyżej
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedNotes.map((note) => {
            const author = note.author_id ? profileMap.get(note.author_id) : null;
            const isEditing = editingId === note.id;
            const timeAgo = formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: pl });
            const fullDate = format(new Date(note.created_at), "dd.MM.yyyy, HH:mm", { locale: pl });
            const wasEdited =
              note.updated_at !== note.created_at &&
              new Date(note.updated_at).getTime() - new Date(note.created_at).getTime() > 1000;

            return (
              <Card
                key={note.id}
                className={`group transition-shadow hover:shadow-md ${note.is_pinned ? "border-amber-200 bg-amber-50/40 dark:border-amber-800/40 dark:bg-amber-950/20" : ""}`}
              >
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="h-8 w-8 shrink-0">
                        {author?.avatar_url && <AvatarImage src={author.avatar_url} />}
                        <AvatarFallback
                          className={`text-xs ${author?.full_name ? "bg-primary/10 text-primary" : "bg-muted/60 text-muted-foreground"}`}
                        >
                          {getInitials(author?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${author?.full_name ? "" : "text-muted-foreground italic"}`}
                        >
                          {author?.full_name || "Usunięty użytkownik"}
                        </p>
                        <p className="text-xs text-muted-foreground" title={fullDate}>
                          {timeAgo}
                          {note.is_pinned && <Pin className="inline h-3 w-3 ml-1 text-amber-600 fill-current" />}
                          {wasEdited && <span className="ml-1 italic">(edytowano)</span>}
                        </p>
                      </div>
                    </div>

                    {canManageNote(note.author_id) && !isEditing && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleTogglePin(note.id, note.is_pinned)}>
                            <Pin className={`h-4 w-4 mr-2 ${note.is_pinned ? "fill-current text-amber-600" : ""}`} />
                            {note.is_pinned ? "Odepnij" : "Przypnij"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingId(note.id);
                              setEditContent(note.content);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edytuj
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeleteNote(note.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Usuń
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {/* Content */}
                  {isEditing ? (
                    <div className="space-y-2 mt-1">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[60px] resize-none"
                        autoFocus
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                          Anuluj
                        </Button>
                        <Button size="sm" onClick={() => handleUpdateNote(note.id)} disabled={!editContent.trim()}>
                          Zapisz
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{note.content}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
