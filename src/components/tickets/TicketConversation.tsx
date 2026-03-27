import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SafeHtmlRenderer from "./SafeHtmlRenderer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import TemplateCombobox from "./TemplateCombobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, Send, Download, Paperclip, User, Headset, Bot } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TicketConversationProps {
  ticketId: string;
  ticket: {
    description?: string | null;
    created_at: string;
    created_by?: string | null;
  };
  /** Attachments linked to the original ticket (message_id IS NULL) */
  originalAttachments?: any[];
  /** Whether current user can reply as admin */
  isAdmin?: boolean;
}

export default function TicketConversation({
  ticketId,
  ticket,
  originalAttachments = [],
  isAdmin = false,
}: TicketConversationProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch messages
  const { data: messages, isLoading } = useQuery({
    queryKey: ["ticket-messages", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_messages" as any)
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Fetch all attachments for this ticket
  const { data: allAttachments } = useQuery({
    queryKey: ["ticket-attachments-all", ticketId],
    queryFn: async () => {
      const { data } = await supabase
        .from("ticket_attachments" as any)
        .select("*")
        .eq("ticket_id", ticketId);
      return (data || []) as any[];
    },
  });

  // Send reply mutation
  const sendReply = useMutation({
    mutationFn: async () => {
      if (!reply.trim() || !user) return;

      if (isAdmin) {
        // Admin replies go through the edge function (sends email + saves to DB atomically)
        const bodyText = reply.trim();
        const bodyHtml = `<p>${bodyText.replace(/\n/g, "<br/>")}</p>`;

        const { data, error } = await supabase.functions.invoke("send-ticket-reply", {
          body: {
            ticket_id: ticketId,
            body_html: bodyHtml,
            body_text: bodyText,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      } else {
        // Client replies insert directly (no outbound email needed)
        const { error } = await supabase.from("ticket_messages" as any).insert({
          ticket_id: ticketId,
          sender_type: "client",
          sender_id: user.id,
          body_html: `<p>${reply.trim().replace(/\n/g, "<br/>")}</p>`,
          body_text: reply.trim(),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["ticket-messages", ticketId] });
      toast.success(isAdmin ? "Odpowiedź wysłana do klienta" : "Odpowiedź wysłana");
    },
    onError: (err: any) => {
      console.error("Reply error:", err);
      toast.error("Nie udało się wysłać wiadomości");
    },
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  // Helpers
  const getAttachmentsForMessage = (messageId: string | null) => {
    if (!allAttachments) return [];
    if (!messageId) return allAttachments.filter((a: any) => !a.message_id);
    return allAttachments.filter((a: any) => a.message_id === messageId);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString("pl-PL", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  const senderIcon = (type: string) => {
    if (type === "client") return <User className="h-4 w-4" />;
    if (type === "system") return <Bot className="h-4 w-4" />;
    return <Headset className="h-4 w-4" />;
  };

  const senderLabel = (type: string) => {
    if (type === "client") return "Klient";
    if (type === "system") return "System";
    return "Wsparcie";
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Wątek konwersacji</h3>
      <Separator />

      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
        {/* Original ticket message */}
        <MessageBubble
          senderType="client"
          label="Zgłoszenie inicjujące"
          icon={<User className="h-4 w-4" />}
          date={formatDate(ticket.created_at)}
          isRight={false}
        >
          {ticket.description ? (
            <SafeHtmlRenderer html={ticket.description} />
          ) : (
            <p className="text-sm text-muted-foreground italic">Brak treści zgłoszenia.</p>
          )}
          <AttachmentList attachments={originalAttachments.length > 0 ? originalAttachments : getAttachmentsForMessage(null)} />
        </MessageBubble>

        {/* Thread messages */}
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          (messages || []).map((msg: any) => {
            const isClient = msg.sender_type === "client";
            return (
              <MessageBubble
                key={msg.id}
                senderType={msg.sender_type}
                label={senderLabel(msg.sender_type)}
                icon={senderIcon(msg.sender_type)}
                date={formatDate(msg.created_at)}
                isRight={!isClient}
              >
                <SafeHtmlRenderer html={msg.body_html || msg.body_text || ""} />
                <AttachmentList attachments={getAttachmentsForMessage(msg.id)} />
              </MessageBubble>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply box */}
      <Separator />
      <div className="space-y-2">
        {isAdmin && (
          <TemplateCombobox
            onSelect={(tplContent) =>
              setReply((prev) => prev ? prev + "\n\n" + tplContent : tplContent)
            }
          />
        )}
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Napisz odpowiedź..."
          className="min-h-[220px] resize-y text-sm leading-relaxed"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendReply.mutate();
          }}
        />
        <div className="flex justify-end">
          <Button
            onClick={() => sendReply.mutate()}
            disabled={!reply.trim() || sendReply.isPending}
            className="gap-2"
          >
            {sendReply.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Odpowiedz
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ───── Sub-components ───── */

function MessageBubble({
  senderType,
  label,
  icon,
  date,
  isRight,
  children,
}: {
  senderType: string;
  label: string;
  icon: React.ReactNode;
  date: string;
  isRight: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex", isRight ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "rounded-lg p-4 max-w-[85%] space-y-2 border",
          isRight
            ? "bg-primary/5 border-primary/20"
            : "bg-muted/50 border-border"
        )}
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-[10px] bg-muted">{icon}</AvatarFallback>
          </Avatar>
          <span className="font-medium text-foreground">{label}</span>
          <span>·</span>
          <span>{date}</span>
        </div>
        {children}
      </div>
    </div>
  );
}

function AttachmentList({ attachments }: { attachments: any[] }) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 pt-2">
      {attachments.map((a: any) => (
        <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer">
          <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-accent text-xs">
            <Download className="h-3 w-3" /> {a.file_name}
          </Badge>
        </a>
      ))}
    </div>
  );
}
