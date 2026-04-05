import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

interface TicketCommentsProps {
  ticketId: string;
}

export default function TicketComments({ ticketId }: TicketCommentsProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [content, setContent] = useState("");

  const { data: comments, isLoading } = useQuery({
    queryKey: ["ticket-comments", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_comments")
        .select("id, content, created_at, user_id, profiles:user_id(full_name, avatar_url, role)")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!content.trim() || !user) return;
      const { error } = await supabase.from("ticket_comments").insert({
        ticket_id: ticketId,
        user_id: user.id,
        content: content.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setContent("");
      qc.invalidateQueries({ queryKey: ["ticket-comments", ticketId] });
    },
    onError: () => toast.error("Nie udało się dodać komentarza"),
  });

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Konwersacja</h3>
      <Separator />

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (comments || []).length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">Brak komentarzy. Rozpocznij rozmowę poniżej.</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {(comments || []).map((c: any) => {
            const profile = c.profiles;
            const displayName = profile?.full_name || "Usunięty użytkownik";
            const initials = profile?.full_name
              ? profile.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
              : "?";
            return (
              <div key={c.id} className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                  <AvatarFallback className={`text-xs ${profile ? "bg-muted" : "bg-muted/60 text-muted-foreground"}`}>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-sm font-medium ${profile ? "text-foreground" : "text-muted-foreground italic"}`}>{displayName}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap">{c.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 items-end">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Napisz odpowiedź..."
          className="min-h-[60px] resize-none"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addComment.mutate(); }}
        />
        <Button
          size="icon"
          onClick={() => addComment.mutate()}
          disabled={!content.trim() || addComment.isPending}
        >
          {addComment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
