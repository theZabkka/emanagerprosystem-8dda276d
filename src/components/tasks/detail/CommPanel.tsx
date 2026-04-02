import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Send, Lock, MessageSquare, Activity } from "lucide-react";

export function CommPanel({ ctx }: { ctx: any }) {
  const {
    task, id, user, isClient, isPreviewMode, comments, statusHistory,
    commentText, setCommentText, commentType, setCommentType,
    addComment, handleClientComment, queryClient,
  } = ctx;

  const [activeTab, setActiveTab] = useState<"comments" | "activity">("comments");

  const showInput = !isPreviewMode && !isClient;
  const showClientInput = isClient && !isPreviewMode;

  const displayComments = (() => {
    if (!comments) return [];
    if (isClient || isPreviewMode) return comments.filter((c: any) => c.type !== "internal");
    return comments;
  })();

  return (
    <div className="flex flex-col h-full">
      {/* Toggle header */}
      <div className="flex border-b shrink-0">
        <button
          onClick={() => setActiveTab("comments")}
          className={cn("flex-1 text-[11px] font-medium py-2 px-3 transition-colors flex items-center justify-center gap-1.5",
            activeTab === "comments" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          <MessageSquare className="h-3 w-3" />Komentarze
        </button>
        {!isClient && !isPreviewMode && (
          <button
            onClick={() => setActiveTab("activity")}
            className={cn("flex-1 text-[11px] font-medium py-2 px-3 transition-colors flex items-center justify-center gap-1.5",
              activeTab === "activity" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <Activity className="h-3 w-3" />Aktywność
          </button>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {activeTab === "comments" ? (
            displayComments.length > 0 ? (
              [...displayComments].reverse().map((c: any) => {
                const isInternal = c.type === "internal";
                const isOwn = c.user_id === user?.id;
                return (
                  <div key={c.id} className={cn("rounded-lg p-2.5 text-xs space-y-1 border-l-[3px]",
                    isInternal ? "border-l-amber-500 bg-amber-500/5" : "border-l-primary bg-primary/5")}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[8px] bg-muted font-bold">
                          {(c.profiles?.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-[11px]">{c.profiles?.full_name || "Użytkownik"}</span>
                      {!isClient && c.profiles?.role && (
                        <Badge variant="secondary" className="text-[8px] h-3.5 capitalize">{c.profiles.role}</Badge>
                      )}
                      {!isClient && isInternal && (
                        <span title="Wewnętrzny"><Lock className="h-2.5 w-2.5 text-amber-500" /></span>
                      )}
                      {!isClient && !isInternal && (
                        <Badge variant="outline" className="text-[8px] h-3.5">Klient</Badge>
                      )}
                      <span className="text-[9px] text-muted-foreground ml-auto">
                        {new Date(c.created_at).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-xs whitespace-pre-wrap">{c.content}</p>
                    {c.client_reply && (
                      <div className="mt-1 bg-primary/5 border border-primary/20 rounded px-2 py-1">
                        <p className="text-[9px] font-semibold text-primary uppercase mb-0.5">Odpowiedź klienta</p>
                        <p className="text-xs">{c.client_reply}</p>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground py-8 text-center">Brak komentarzy</p>
            )
          ) : (
            /* Activity tab - status history */
            (statusHistory || []).length > 0 ? (
              (statusHistory || []).map((h: any, i: number) => (
                <div key={h.id || i} className="flex items-start gap-2 text-xs py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p>
                      <span className="font-medium">{h.profiles?.full_name || "System"}</span>
                      {" → "}
                      <Badge className={cn("text-[8px]", (ctx.statusColors || {})[h.new_status])}>{(ctx.statusLabels || {})[h.new_status] || h.new_status}</Badge>
                    </p>
                    {h.note && <p className="text-muted-foreground mt-0.5">{h.note}</p>}
                    <p className="text-[9px] text-muted-foreground">{new Date(h.created_at).toLocaleString("pl-PL")}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-8 text-center">Brak aktywności</p>
            )
          )}
        </div>
      </ScrollArea>

      {/* Input area - staff */}
      {showInput && activeTab === "comments" && (
        <div className="border-t p-3 space-y-1.5 shrink-0">
          <div className="flex items-center gap-2">
            <Checkbox id="comm-internal" checked={commentType === "internal"}
              onCheckedChange={(v: any) => setCommentType(v ? "internal" : "client")}
              className="h-3 w-3" />
            <Label htmlFor="comm-internal" className="text-[10px] flex items-center gap-1 cursor-pointer">
              <Lock className="h-2.5 w-2.5 text-amber-500" />Wewnętrzny
            </Label>
          </div>
          <div className="flex gap-1.5 items-end">
            <Textarea value={commentText} onChange={(e: any) => setCommentText(e.target.value)}
              placeholder="Napisz komentarz..."
              onKeyDown={(e: any) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(); } }}
              className="min-h-[40px] max-h-[100px] text-xs resize-none" />
            <Button size="icon" onClick={addComment} className="h-8 w-8 shrink-0"><Send className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      )}

      {/* Input area - client */}
      {showClientInput && activeTab === "comments" && (
        <div className="border-t p-3 shrink-0">
          <div className="flex gap-1.5 items-end">
            <Textarea value={commentText} onChange={(e: any) => setCommentText(e.target.value)}
              placeholder="Napisz wiadomość..."
              onKeyDown={(e: any) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleClientComment(); } }}
              className="min-h-[40px] max-h-[100px] text-xs resize-none" />
            <Button size="icon" onClick={handleClientComment} className="h-8 w-8 shrink-0"><Send className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
