import { Bell, Bug, Mail, Ticket, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const typeIcon: Record<string, typeof Bug> = {
  bug: Bug,
  message: Mail,
  ticket: Ticket,
};

const typeColor: Record<string, string> = {
  bug: "text-destructive",
  message: "text-blue-500",
  ticket: "text-amber-500",
};

export function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data as any[]) || [];
    },
    enabled: !!user,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true } as any).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markAllRead = async () => {
    await supabase.from("notifications").update({ is_read: true } as any).eq("is_read", false);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const handleClick = async (notif: Notification) => {
    if (!notif.is_read) await markAsRead(notif.id);
    if (notif.link) navigate(notif.link);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 p-0 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground border-0">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Powiadomienia</p>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={markAllRead}>
              <CheckCheck className="h-3.5 w-3.5" />
              Oznacz wszystkie
            </Button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Brak powiadomień</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            {notifications.map((notif) => {
              const Icon = typeIcon[notif.type] || Bell;
              return (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-accent/50 transition-colors border-b border-border/50 last:border-0 ${
                    !notif.is_read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className={`mt-0.5 shrink-0 ${typeColor[notif.type] || "text-muted-foreground"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-tight truncate ${!notif.is_read ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                      {notif.title}
                    </p>
                    {notif.content && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.content.replace(/<[^>]*>/g, "")}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: pl })}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
