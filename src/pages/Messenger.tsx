const EMOJI_LIST = ["👍", "❤️", "😂", "🎉", "🔥", "👀", "✅", "💯"];

type Channel = { id: string; name: string; type: string; is_direct: boolean; created_at: string };
type Message = {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
};
type Reaction = { id: string; message_id: string; user_id: string; emoji: string };
type Profile = { id: string; full_name: string | null; avatar_url: string | null; email?: string | null; department?: string | null };

export default function Messenger() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [newChannelName, setNewChannelName] = useState("");
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [dmSearch, setDmSearch] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // ─── Data fetching ──────────────────────────────────────────────────

  const { data: allProfiles = [] } = useQuery<Profile[]>({
    queryKey: ["profiles-all"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, avatar_url, email, department");
      return data || [];
    },
  });

  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ["channels"],
    queryFn: async () => {
      const { data } = await supabase.from("channels").select("*").order("created_at");
      return (data || []) as Channel[];
    },
  });

  const { data: channelMembers = [] } = useQuery({
    queryKey: ["channel-members"],
    queryFn: async () => {
      const { data } = await supabase.from("channel_members").select("*");
      return data || [];
    },
  });

  // Filter channels the current user is a member of
  const myChannelIds = useMemo(() => {
    if (!currentUserId) return new Set<string>();
    return new Set(channelMembers.filter(m => m.user_id === currentUserId).map(m => m.channel_id));
  }, [channelMembers, currentUserId]);

  const groupChannels = useMemo(() =>
    channels.filter(c => !c.is_direct && myChannelIds.has(c.id)), [channels, myChannelIds]);

  const dmChannels = useMemo(() =>
    channels.filter(c => c.is_direct && myChannelIds.has(c.id)), [channels, myChannelIds]);

  // For each DM, find the other person
  const dmPartners = useMemo(() => {
    const map: Record<string, Profile> = {};
    dmChannels.forEach(ch => {
      const members = channelMembers.filter(m => m.channel_id === ch.id);
      const otherMember = members.find(m => m.user_id !== currentUserId);
      if (otherMember) {
        const p = allProfiles.find(pr => pr.id === otherMember.user_id);
        if (p) map[ch.id] = p;
      }
    });
    return map;
  }, [dmChannels, channelMembers, currentUserId, allProfiles]);

  // Auto-select first channel
  useEffect(() => {
    if ((groupChannels.length > 0 || dmChannels.length > 0) && !activeChannel) {
      setActiveChannel(groupChannels[0]?.id || dmChannels[0]?.id);
    }
  }, [groupChannels, dmChannels, activeChannel]);

  // Fetch messages
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["messages", activeChannel],
    queryFn: async () => {
      if (!activeChannel) return [];

      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("channel_id", activeChannel)
        .order("created_at")
        .limit(200);
      return (data || []).map((m: any) => {
        const sender = allProfiles.find(p => p.id === m.sender_id);
        return { ...m, profiles: sender ? { full_name: sender.full_name, avatar_url: sender.avatar_url } : null };
      }) as Message[];
    },
    enabled: !!activeChannel,
  });

  // Fetch reactions
  const messageIds = messages.map(m => m.id);
  const { data: reactions = [] } = useQuery<Reaction[]>({
    queryKey: ["reactions", messageIds],
    queryFn: async () => {
      if (messageIds.length === 0) return [];
      const { data } = await supabase.from("message_reactions").select("*").in("message_id", messageIds);
      return (data || []) as Reaction[];
    },
    enabled: messageIds.length > 0,
  });

  // ─── Real-time (only in database mode) ──────────────────────────────

  useEffect(() => {
    if (!activeChannel) return;
    const sub = supabase
      .channel(`messages-${activeChannel}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `channel_id=eq.${activeChannel}` },
        () => queryClient.invalidateQueries({ queryKey: ["messages", activeChannel] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" },
        () => queryClient.invalidateQueries({ queryKey: ["reactions"] }))
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [activeChannel, queryClient]);

  // Presence & typing
  useEffect(() => {
    if (!activeChannel || !user) return;
    const ch = supabase.channel(`room-${activeChannel}`, {
      config: { presence: { key: user.id } },
    });
    ch.on("presence", { event: "sync" }, () => {
      setOnlineUsers(Object.keys(ch.presenceState()));
    });
    ch.on("broadcast", { event: "typing" }, ({ payload }) => {
      if (payload.user_id !== user.id) {
        setTypingUsers(prev => ({ ...prev, [payload.user_id]: payload.name }));
        setTimeout(() => {
          setTypingUsers(prev => { const n = { ...prev }; delete n[payload.user_id]; return n; });
        }, 3000);
      }
    });
    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track({ user_id: user.id, name: profile?.full_name || "User" });
    });
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [activeChannel, user, profile]);

  // Demo mode: simulate some online users
  // Scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Mutations ──────────────────────────────────────────────────────

  const sendMutation = useMutation({
    mutationFn: async ({ content, attachmentUrl, attachmentType, attachmentName }: { content: string; attachmentUrl?: string; attachmentType?: string; attachmentName?: string }) => {
      await supabase.from("messages").insert({
        channel_id: activeChannel,
        sender_id: user!.id,
        content,
        attachment_url: attachmentUrl || null,
        attachment_type: attachmentType || null,
        attachment_name: attachmentName || null,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", activeChannel] });
    },
  });

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return;
    const existing = reactions.find(r => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji);
    if (existing) {
      await supabase.from("message_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("message_reactions").insert({ message_id: messageId, user_id: user.id, emoji } as any);
    }
    queryClient.invalidateQueries({ queryKey: ["reactions"] });
  }, [user, reactions, queryClient]);

  const createChannel = useMutation({
    mutationFn: async (name: string) => {
      const { data: ch } = await supabase.from("channels").insert({ name, type: "public", is_direct: false } as any).select().single();
      if (ch && user) {
        await supabase.from("channel_members").insert({ channel_id: (ch as any).id, user_id: user.id } as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      queryClient.invalidateQueries({ queryKey: ["channel-members"] });
      setNewChannelName("");
      setShowNewChannel(false);
    },
  });

  const createDM = useMutation({
    mutationFn: async (otherUserId: string) => {
      // Check if DM already exists
      const existingDM = dmChannels.find(ch => {
        const members = channelMembers.filter(m => m.channel_id === ch.id);
        return members.some(m => m.user_id === otherUserId);
      });
      if (existingDM) {
        setActiveChannel(existingDM.id);
        return;
      }
      const { data: ch } = await supabase.from("channels").insert({ name: "DM", type: "direct", is_direct: true } as any).select().single();
      if (ch && user) {
        await supabase.from("channel_members").insert([
          { channel_id: (ch as any).id, user_id: user.id },
          { channel_id: (ch as any).id, user_id: otherUserId },
        ] as any);
        setActiveChannel((ch as any).id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      queryClient.invalidateQueries({ queryKey: ["channel-members"] });
      setShowNewDM(false);
      setDmSearch("");
    },
  });

  // ─── File upload ────────────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    e.target.value = "";
  };

  const uploadAndSend = async () => {
    if (!pendingFile || !activeChannel) return;
    setUploading(true);
    try {
      const fileName = `${Date.now()}-${pendingFile.name}`;
      const { data: uploadData, error } = await supabase.storage
        .from("chat_attachments")
        .upload(fileName, pendingFile);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("chat_attachments").getPublicUrl(uploadData.path);
      const isImage = pendingFile.type.startsWith("image/");
      const content = messageText.trim() || (isImage ? "📷 Obraz" : `📎 ${pendingFile.name}`);
      sendMutation.mutate({
        content,
        attachmentUrl: urlData.publicUrl,
        attachmentType: isImage ? "image" : "file",
        attachmentName: pendingFile.name,
      });
      setMessageText("");
      setPendingFile(null);
    } catch {
      // silent fail
    } finally {
      setUploading(false);
    }
  };

  // ─── Handlers ───────────────────────────────────────────────────────

  const handleSend = () => {
    if (pendingFile) {
      uploadAndSend();
      return;
    }
    const trimmed = messageText.trim();
    if (!trimmed || !activeChannel) return;
    sendMutation.mutate({ content: trimmed });
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
        type: "broadcast", event: "typing",
        payload: { user_id: user.id, name: profile?.full_name || "User" },
      });
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────────

  const activeChannelObj = channels.find(c => c.id === activeChannel);
  const typingNames = Object.values(typingUsers);

  const getInitials = (name: string | null | undefined) =>
    name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "?";

  const groupedReactions = (msgId: string) => {
    const msgReactions = reactions.filter(r => r.message_id === msgId);
    const grouped: Record<string, string[]> = {};
    msgReactions.forEach(r => {
      if (!grouped[r.emoji]) grouped[r.emoji] = [];
      grouped[r.emoji].push(r.user_id);
    });
    return grouped;
  };

  const getChannelDisplayName = (ch: Channel) => {
    if (!ch.is_direct) return ch.name;
    const partner = dmPartners[ch.id];
    return partner?.full_name || "Wiadomość bezpośrednia";
  };

  const availableDMUsers = allProfiles.filter(p =>
    p.id !== currentUserId &&
    p.full_name?.toLowerCase().includes(dmSearch.toLowerCase())
  );

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <AppLayout title="Komunikator">
      <div className="flex h-[calc(100vh-8rem)] rounded-lg border border-border overflow-hidden bg-card">
        {/* Sidebar */}
        <div className="w-72 border-r border-border flex flex-col bg-muted/30">
          <div className="p-3 border-b border-border">
            <span className="text-base font-bold text-foreground">Komunikator</span>
          </div>

          <ScrollArea className="flex-1">
            {/* KANAŁY section */}
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kanały</span>
                <Dialog open={showNewChannel} onOpenChange={setShowNewChannel}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Nowy kanał</DialogTitle></DialogHeader>
                    <div className="flex gap-2">
                      <Input placeholder="Nazwa kanału" value={newChannelName}
                        onChange={e => setNewChannelName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && newChannelName.trim() && createChannel.mutate(newChannelName.trim())} />
                      <Button onClick={() => newChannelName.trim() && createChannel.mutate(newChannelName.trim())} disabled={!newChannelName.trim()}>Utwórz</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="space-y-0.5 mt-1">
                {groupChannels.map(ch => (
                  <button key={ch.id} onClick={() => setActiveChannel(ch.id)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                      activeChannel === ch.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}>
                    <Hash className="h-4 w-4 shrink-0" />
                    <span className="truncate">{ch.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <Separator className="mx-2" />

            {/* DM section */}
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Wiadomości bezpośrednie</span>
                {(
                  <Dialog open={showNewDM} onOpenChange={setShowNewDM}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Nowa wiadomość bezpośrednia</DialogTitle></DialogHeader>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Szukaj użytkownika..." className="pl-9" value={dmSearch} onChange={e => setDmSearch(e.target.value)} />
                      </div>
                      <ScrollArea className="max-h-60">
                        <div className="space-y-1">
                          {availableDMUsers.map(p => (
                            <button key={p.id} onClick={() => createDM.mutate(p.id)}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-sm text-left">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/20 text-primary text-xs">{getInitials(p.full_name)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-foreground">{p.full_name}</div>
                                <div className="text-xs text-muted-foreground">{p.department || p.email}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              <div className="space-y-0.5 mt-1">
                {dmChannels.map(ch => {
                  const partner = dmPartners[ch.id];
                  const isOnline = onlineUsers.includes(partner?.id || "");
                  return (
                    <button key={ch.id} onClick={() => setActiveChannel(ch.id)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                        activeChannel === ch.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      }`}>
                      <div className="relative">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px] bg-primary/20 text-primary">{getInitials(partner?.full_name)}</AvatarFallback>
                        </Avatar>
                        {isOnline && (
                          <Circle className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 fill-green-500 text-green-500 stroke-background stroke-2" />
                        )}
                      </div>
                      <span className="truncate">{partner?.full_name || "Użytkownik"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="h-14 border-b border-border flex items-center px-4 gap-2">
            {activeChannelObj?.is_direct ? (
              <>
                <MessageCircle className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold text-foreground">{getChannelDisplayName(activeChannelObj)}</span>
                {onlineUsers.includes(dmPartners[activeChannelObj.id]?.id || "") && (
                  <span className="text-xs text-green-600 flex items-center gap-1"><Circle className="h-2 w-2 fill-green-500" />online</span>
                )}
              </>
            ) : (
              <>
                <Hash className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold text-foreground">{activeChannelObj?.name || "Wybierz kanał"}</span>
              </>
            )}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-1">
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                  Brak wiadomości. Rozpocznij konwersację!
                </div>
              )}
              {messages.map((msg, idx) => {
                const prev = messages[idx - 1];
                const showAvatar = !prev || prev.sender_id !== msg.sender_id ||
                  new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 300000;
                const senderName = (msg.profiles as any)?.full_name || "Użytkownik";
                const grouped = groupedReactions(msg.id);

                return (
                  <div key={msg.id} className={`group flex gap-3 ${showAvatar ? "mt-4" : "mt-0.5"}`}>
                    {showAvatar ? (
                      <Avatar className="h-8 w-8 mt-0.5">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">{getInitials(senderName)}</AvatarFallback>
                      </Avatar>
                    ) : <div className="w-8" />}
                    <div className="flex-1 min-w-0">
                      {showAvatar && (
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-foreground">{senderName}</span>
                          <span className="text-xs text-muted-foreground">{format(new Date(msg.created_at), "HH:mm", { locale: pl })}</span>
                        </div>
                      )}
                      <p className="text-sm text-foreground break-words">{msg.content}</p>

                      {/* Attachment */}
                      {msg.attachment_url && msg.attachment_type === "image" && (
                        <div className="mt-2 max-w-sm">
                          <img src={msg.attachment_url} alt={msg.attachment_name || "attachment"}
                            className="rounded-lg border border-border max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(msg.attachment_url!, "_blank")} />
                          {msg.attachment_name && <span className="text-xs text-muted-foreground mt-1 block">{msg.attachment_name}</span>}
                        </div>
                      )}
                      {msg.attachment_url && msg.attachment_type === "file" && (
                        <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer"
                          className="mt-2 flex items-center gap-2 p-2 rounded-md border border-border bg-muted/50 hover:bg-muted transition-colors max-w-xs">
                          <FileText className="h-5 w-5 text-primary shrink-0" />
                          <span className="text-sm text-foreground truncate flex-1">{msg.attachment_name || "Plik"}</span>
                          <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                        </a>
                      )}

                      {/* Reactions */}
                      {Object.keys(grouped).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(grouped).map(([emoji, userIds]) => (
                            <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                                userIds.includes(currentUserId || "")
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border bg-muted text-muted-foreground hover:bg-accent"
                              }`}>
                              <span>{emoji}</span><span>{userIds.length}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 p-1 rounded hover:bg-accent">
                            <SmilePlus className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2" align="start">
                          <div className="flex gap-1">
                            {EMOJI_LIST.map(e => (
                              <button key={e} onClick={() => toggleReaction(msg.id, e)} className="text-lg hover:bg-accent rounded p-1">{e}</button>
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
            <div className="px-4 py-1 text-xs text-muted-foreground flex items-center gap-2">
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
              <span>{typingNames.join(", ")} {typingNames.length === 1 ? "pisze" : "piszą"}...</span>
            </div>
          )}

          {/* Pending file preview */}
          {pendingFile && (
            <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center gap-2">
              {pendingFile.type.startsWith("image/") ? (
                <img src={URL.createObjectURL(pendingFile)} alt="" className="h-12 w-12 rounded object-cover border border-border" />
              ) : (
                <FileText className="h-8 w-8 text-primary" />
              )}
              <span className="text-sm text-foreground truncate flex-1">{pendingFile.name}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPendingFile(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-1 mb-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => fileInputRef.current?.click()} >
                <Paperclip className="h-4 w-4" />
              </Button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
            </div>
            <div className="flex gap-2">
              <Input
                placeholder={`Napisz wiadomość... (Enter wyślij, Shift+Enter nowa linia)`}
                value={messageText}
                onChange={e => { setMessageText(e.target.value); broadcastTyping(); }}
                onKeyDown={handleKeyDown}
                className="flex-1"
                
              />
              <Button onClick={handleSend} disabled={(!messageText.trim() && !pendingFile) || uploading} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
