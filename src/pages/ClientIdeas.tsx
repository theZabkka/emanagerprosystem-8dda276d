import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Lightbulb, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  new: "Nowy",
  reviewed: "Rozpatrzony",
  accepted: "Zaakceptowany",
  rejected: "Odrzucony",
};

const statusColors: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-700",
  reviewed: "bg-amber-500/15 text-amber-700",
  accepted: "bg-emerald-500/15 text-emerald-700",
  rejected: "bg-red-500/15 text-red-700",
};

export default function ClientIdeas() {
  const { clientId } = useRole();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const { data: ideas, isLoading } = useQuery({
    queryKey: ["client-ideas", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data } = await supabase
        .from("client_ideas")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!clientId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!clientId || !user) throw new Error("Brak danych");
      const { error } = await supabase.from("client_ideas").insert({
        client_id: clientId,
        title,
        description,
        status: "new",
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-ideas"] });
      toast.success("Pomysł został zgłoszony!");
      setTitle("");
      setDescription("");
      setOpen(false);
    },
    onError: (e: any) => toast.error("Błąd: " + e.message),
  });

  return (
    <AppLayout title="Moje Pomysły">
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Moje pomysły</h2>
            <p className="text-sm text-muted-foreground">Zgłoś pomysł lub sugestię do Twojego projektu.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Zgłoś pomysł</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nowy pomysł</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Tytuł</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Np. Dodać sekcję FAQ" />
                </div>
                <div>
                  <Label>Opis</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Opisz swój pomysł..." rows={4} />
                </div>
                <Button onClick={() => createMutation.mutate()} disabled={!title.trim() || createMutation.isPending} className="w-full">
                  {createMutation.isPending ? "Wysyłanie..." : "Wyślij pomysł"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Ładowanie...</p>
        ) : ideas && ideas.length > 0 ? (
          <div className="space-y-3">
            {ideas.map((idea) => (
              <Card key={idea.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{idea.title}</h4>
                      {idea.description && (
                        <p className="text-sm text-muted-foreground mt-1">{idea.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(idea.created_at!).toLocaleDateString("pl-PL")}
                      </p>
                    </div>
                    <Badge variant="outline" className={statusColors[idea.status] || ""}>
                      {statusLabels[idea.status] || idea.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Lightbulb className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nie zgłosiłeś jeszcze żadnych pomysłów.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
