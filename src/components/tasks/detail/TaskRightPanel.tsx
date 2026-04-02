import { useState, useMemo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Send, Lock, MessageCircle, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const URL_REGEX = /(https?:\/\/[^\s<]+)/g;
function linkifyText(text: string): React.ReactNode[] {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) =>
    URL_REGEX.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{part}</a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

interface TaskRightPanelProps {
  taskId: string;
  comments: any[];
  statusHistory: any[];
  isClient: boolean;
  isPreviewMode: boolean;
  user: any;
}

// Inline client reply
function ClientReplyInput({ commentId, taskId }: { commentId: string; taskId: string }) {
  const [reply, setReply] = useState("");
  const queryClient = useQueryClient();

  async function submitReply() {
    if (!reply.trim()) return;
    const { error } = await supabase.from("comments").update({ client_reply: reply } as any).eq("id", commentId);
    if (error) { toast.error("Błąd wysyłania"); return; }
    queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
    setReply("");
    toast.success("Odpowiedź wysłana");
  }

  return (
    <div className="mt-2 flex gap-2">
      <Textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Napisz odpowiedź..." className="min-h-[40px] text-sm" />
      <Button size="sm" onClick={submitReply} disabled={!reply.trim()} className="self-end"><Send className="h-3 w-3" /></Button>
    </div>
  );
}

export function TaskRightPanel({ taskId, comments, statusHistory, isClient, isPreviewMode, user }: TaskRightPanelProps) {
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [commentType, setCommentType] = useState("internal");
  const [activeTab, setActiveTab] = useState<"discussion" | "logs">("discussion");
  const [commentFilter, setCommentFilter] = useState("all");

  const filteredComments = useMemo(() => {
    if (!comments) return [];
    if (isClient) return comments.filter((c: any) => c.type !== "internal");
    if (isPreviewMode) return comments.filter((c: any) => c.type !== "internal");
    if (commentFilter === "all") return comments;
    return comments.filter((c: any) => c.type === commentFilter);
  }, [comments, commentFilter, isClient, isPreviewMode]);

  async function addComment() {
    if (!commentText.trim() || !user) return;
    const type = isClient ? "client" : commentType;
    const { error } = await supabase.from("comments").insert({ task_id: taskId, user_id: user.id, content: commentText, type });
    if (error) { toast.error(error.message); return; }
    setCommentText("");
    queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
  }

  // System logs from status history
  const sortedHistory = useMemo(() => {
    if (!statusHistory) return [];
    return [...statusHistory].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [statusHistory]);

  return (
    <div className="flex flex-col h-full">
      {/* Toggle tabs */}
      <div className="flex border-b shrink-0">
        <button
          onClick={() => setActiveTab("discussion")}
          className={`flex-1 text-xs font-medium py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === "discussion" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageCircle className="h-3.5 w-3.5" /> Dyskusja
        </button>
        {!isClient && !isPreviewMode && (
          <button
            onClick={() => setActiveTab("logs")}
            className={`flex-1 text-xs font-medium py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === "logs" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="h-3.5 w-3.5" /> Logi
          </button>
        )}
      </div>

      {/* Filter row for staff */}
      {activeTab === "discussion" && !isPreviewMode && !isClient && (
        <div className="flex gap-1 px-3 pt-2 shrink-0">
          {["all", "internal", "client"].map(f => (
            <Button key={f} variant={commentFilter === f ? "default" : "outline"} size="sm" className="text-[10px] h-6 px-2"
              onClick={() => setCommentFilter(f)}>
              {f === "all" ? "Wszystkie" : f === "internal" ? "Wewnętrzne" : "Klient"}
            </Button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3 py-3">
        {activeTab === "discussion" ? (
          <div className="space-y-3">
            {filteredComments.length > 0 ? filteredComments.map((c: any) => (
              <div key={c.id} className="space-y-1">
                <div className="flex gap-2">
                  <Avatar className="h-6 w-6 mt-0.5 shrink-0">
                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                      {(c.profiles?.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium">{c.profiles?.full_name || "?"}</span>
                      {!isClient && c.profiles?.role && (
                        <Badge variant="secondary" className="text-[9px] h-4 capitalize">{c.profiles.role}</Badge>
                      )}
                      {!isClient && (
                        <Badge variant={c.type === "client" ? "default" : "outline"} className="text-[9px] h-4">
                          {c.type === "client" ? "Klient" : "Wewnętrzny"}
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString("pl-PL")}</span>
                    </div>
                    <p className="text-sm mt-0.5">{c.content}</p>
                    {c.client_reply && (
                      <div className="mt-1.5 bg-primary/5 border border-primary/20 rounded-md px-2.5 py-1.5">
                        <p className="text-[10px] font-semibold text-primary uppercase mb-0.5">Odpowiedź klienta</p>
                        <p className="text-sm">{c.client_reply}</p>
                      </div>
                    )}
                    {isClient && c.requires_client_reply && !c.client_reply && (
                      <ClientReplyInput commentId={c.id} taskId={taskId} />
                    )}
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-6">Brak komentarzy.</p>
            )}
          </div>
        ) : (
          /* Logs tab */
          <div className="space-y-2">
            {sortedHistory.length > 0 ? sortedHistory.map((h: any) => (
              <div key={h.id} className="flex items-start gap-2 text-xs py-1.5 border-b border-border/50">
                <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <History className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p>
                    <span className="font-medium">{h.profiles?.full_name || "System"}</span>
                    {" zmienił status "}
                    <span className="font-semibold">{h.old_status || "—"}</span>
                    {" → "}
                    <span className="font-semibold">{h.new_status}</span>
                  </p>
                  {h.note && <p className="text-muted-foreground italic mt-0.5">{h.note}</p>}
                  <p className="text-muted-foreground">{new Date(h.created_at).toLocaleString("pl-PL")}</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-6">Brak logów.</p>
            )}
          </div>
        )}
      </div>

      {/* Sticky bottom input */}
      {activeTab === "discussion" && !isPreviewMode && (
        <div className="border-t px-3 py-2.5 shrink-0 bg-background">
          {!isClient && (
            <div className="flex items-center gap-2 mb-1.5">
              <Checkbox id="internal-rp" checked={commentType === "internal"} onCheckedChange={(v) => setCommentType(v ? "internal" : "client")} className="h-3.5 w-3.5" />
              <Label htmlFor="internal-rp" className="text-[10px] flex items-center gap-1 cursor-pointer">
                <Lock className="h-3 w-3 text-amber-500" />Wewnętrzny
              </Label>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <Textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder={isClient ? "Napisz wiadomość..." : "Napisz komentarz..."}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(); } }}
              className="min-h-[44px] max-h-[100px] resize-none text-sm"
            />
            <Button size="icon" onClick={addComment} disabled={!commentText.trim()} className="h-9 w-9 shrink-0"><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
