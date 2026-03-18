import { useState, useEffect, useRef, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Hash, Send, Plus, Users, SmilePlus, Circle,
} from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const EMOJI_LIST = ["👍", "❤️", "😂", "🎉", "🔥", "👀", "✅", "💯"];

type Channel = { id: string; name: string; type: string };
type Message = {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
};
type Reaction = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
};

export default function Messenger() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [newChannelName, setNewChannelName] = useState("");
  const [showNewChannel, setShowNewChannel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch channels
  const { data: channels = [] } = useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const { data } = await supabase
        .from("channels" as any)
        .select("*")
        .order("created_at");
      return (data || []) as unknown as Channel[];
    },
  });

  // Auto-select first channel
  useEffect(() => {
    if (channels.length > 0 && !activeChannel) {
      setActiveChannel(channels[0].id);
    }
  }, [channels, activeChannel]);

  // Fetch messages for active channel
  const { data: messages = [] } = useQuery({
    queryKey: ["messages", activeChannel],
    queryFn: async () => {
      if (!activeChannel) return [];
      const { data } = await supabase
        .from("messages" as any)
        .select("*, profiles:sender_id(full_name, avatar_url)")
        .eq("channel_id", activeChannel)
        .order("created_at")
        .limit(200);
      return (data || []) as Message[];
    },
    enabled: !!activeChannel,
  });

  // Fetch reactions for messages
  const messageIds = messages.map((m) => m.id);
  const { data: reactions = [] } = useQuery({
    queryKey: ["reactions", messageIds],
    queryFn: async () => {
      if (messageIds.length === 0) return [];
      const { data } = await supabase
        .from("message_reactions" as any)
        .select("*")
        .in("message_id", messageIds);
      return (data || []) as Reaction[];
    },
    enabled: messageIds.length > 0,
  });

  // Fetch all profiles for presence display
  const { data: allProfiles = [] } = useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, avatar_url");
      return data || [];
    },
  });

  // Real-time messages subscription
  useEffect(() => {
    if (!activeChannel) return;
    const sub = supabase
      .channel(`messages-${activeChannel}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `channel_id=eq.${activeChannel}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", activeChannel] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["reactions"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [activeChannel, queryClient]);

  // Presence & typing via Supabase Realtime channel
  useEffect(() => {
    if (!activeChannel || !user) return;

    const ch = supabase.channel(`room-${activeChannel}`, {
      config: { presence: { key: user.id } },
    });

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      setOnlineUsers(Object.keys(state));
    });

    ch.on("broadcast", { event: "typing" }, ({ payload }) => {
      if (payload.user_id !== user.id) {
        setTypingUsers((prev) => ({ ...prev, [payload.user_id]: payload.name }));
        setTimeout(() => {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[payload.user_id];
            return next;
          });
        }, 3000);
      }
    });

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ user_id: user.id, name: profile?.full_name || "User" });
      }
    });

    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [activeChannel, user, profile]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      await supabase.from("messages" as any).insert({
        channel_id: activeChannel,
        sender_id: user!.id,
        content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", activeChannel] });
    },
  });

  // Toggle reaction
  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user) return;
      const existing = reactions.find(
        (r) => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji
      );
      if (existing) {
        await supabase.from("message_reactions" as any).delete().eq("id", existing.id);
      } else {
        await supabase.from("message_reactions" as any).insert({
          message_id: messageId,
          user_id: user.id,
          emoji,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["reactions"] });
    },
    [user, reactions, queryClient]
  );

  // Create channel
  const createChannel = useMutation({
    mutationFn: async (name: string) => {
      await supabase.from("channels" as any).insert({ name, type: "public" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      setNewChannelName("");
      setShowNewChannel(false);
    },
  });

  const handleSend = () => {
    const trimmed = messageText.trim();
    if (!trimmed || !activeChannel) return;
    sendMutation.mutate(trimmed);
    setMessageText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const broadcastTyping = () => {
    if (channelRef.current && user) {
      channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { user_id: user.id, name: profile?.full_name || "User" },
      });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {}, 3000);
  };

  const activeChannelObj = channels.find((c) => c.id === activeChannel);
  const typingNames = Object.values(typingUsers);

  const getInitials = (name: string | null | undefined) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

  const groupedReactions = (msgId: string) => {
    const msgReactions = reactions.filter((r) => r.message_id === msgId);
    const grouped: Record<string, string[]> = {};
    msgReactions.forEach((r) => {
      if (!grouped[r.emoji]) grouped[r.emoji] = [];
      grouped[r.emoji].push(r.user_id);
    });
    return grouped;
  };

  return (
    <AppLayout title="Komunikator">
      <div className="flex h-[calc(100vh-8rem)] rounded-lg border border-border overflow-hidden bg-card">
        {/* Channel list */}
        <div className="w-64 border-r border-border flex flex-col bg-muted/30">
          <div className="p-3 flex items-center justify-between border-b border-border">
            <span className="text-sm font-semibold text-foreground">Kanały</span>
            <Dialog open={showNewChannel} onOpenChange={setShowNewChannel}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nowy kanał</DialogTitle>
                </DialogHeader>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nazwa kanału"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && newChannelName.trim() && createChannel.mutate(newChannelName.trim())}
                  />
                  <Button
                    onClick={() => newChannelName.trim() && createChannel.mutate(newChannelName.trim())}
                    disabled={!newChannelName.trim()}
                  >
                    Utwórz
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {channels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannel(ch.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    activeChannel === ch.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Hash className="h-4 w-4 shrink-0" />
                  <span className="truncate">{ch.name}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
          {/* Online users */}
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <Users className="h-3 w-3" />
              <span>Online ({onlineUsers.length})</span>
            </div>
            <div className="space-y-1">
              {onlineUsers.slice(0, 8).map((uid) => {
                const p = allProfiles.find((pr) => pr.id === uid);
                return (
                  <div key={uid} className="flex items-center gap-2 text-xs text-foreground">
                    <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                    <span className="truncate">{p?.full_name || "Użytkownik"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="h-14 border-b border-border flex items-center px-4 gap-2">
            <Hash className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold text-foreground">
              {activeChannelObj?.name || "Wybierz kanał"}
            </span>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg, idx) => {
                const prev = messages[idx - 1];
                const showAvatar =
                  !prev ||
                  prev.sender_id !== msg.sender_id ||
                  new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 300000;
                const senderName =
                  (msg.profiles as any)?.full_name || "Użytkownik";
                const grouped = groupedReactions(msg.id);

                return (
                  <div key={msg.id} className={`group flex gap-3 ${showAvatar ? "mt-4" : "mt-0.5"}`}>
                    {showAvatar ? (
                      <Avatar className="h-8 w-8 mt-0.5">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {getInitials(senderName)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-8" />
                    )}
                    <div className="flex-1 min-w-0">
                      {showAvatar && (
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-foreground">
                            {senderName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(msg.created_at), "HH:mm", { locale: pl })}
                          </span>
                        </div>
                      )}
                      <p className="text-sm text-foreground break-words">{msg.content}</p>
                      {/* Reactions */}
                      {Object.keys(grouped).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(grouped).map(([emoji, userIds]) => (
                            <button
                              key={emoji}
                              onClick={() => toggleReaction(msg.id, emoji)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                                userIds.includes(user?.id || "")
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border bg-muted text-muted-foreground hover:bg-accent"
                              }`}
                            >
                              <span>{emoji}</span>
                              <span>{userIds.length}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {/* Add reaction button (visible on hover) */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 p-1 rounded hover:bg-accent">
                            <SmilePlus className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2" align="start">
                          <div className="flex gap-1">
                            {EMOJI_LIST.map((e) => (
                              <button
                                key={e}
                                onClick={() => toggleReaction(msg.id, e)}
                                className="text-lg hover:bg-accent rounded p-1"
                              >
                                {e}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Typing indicator */}
          {typingNames.length > 0 && (
            <div className="px-4 py-1 text-xs text-muted-foreground animate-pulse">
              {typingNames.join(", ")} {typingNames.length === 1 ? "pisze" : "piszą"}...
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <Input
                placeholder={`Napisz wiadomość na #${activeChannelObj?.name || ""}...`}
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  broadcastTyping();
                }}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={!messageText.trim()} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
