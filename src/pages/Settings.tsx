import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { User, Bell, Palette, Shield, Save } from "lucide-react";

export default function Settings() {
  const { profile, user } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [department, setDepartment] = useState(profile?.department || "");
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true, tasks: true, comments: true, mentions: true,
  });

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, department })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Błąd zapisu profilu");
    } else {
      toast.success("Profil zaktualizowany");
    }
  };

  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <AppLayout title="Ustawienia">
      <div className="max-w-3xl space-y-6">
        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile"><User className="h-4 w-4 mr-1" /> Profil</TabsTrigger>
            <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-1" /> Powiadomienia</TabsTrigger>
            <TabsTrigger value="appearance"><Palette className="h-4 w-4 mr-1" /> Wygląd</TabsTrigger>
            <TabsTrigger value="security"><Shield className="h-4 w-4 mr-1" /> Bezpieczeństwo</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Dane profilu</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg">{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{fullName || "—"}</p>
                    <p className="text-sm text-muted-foreground">{profile?.email || user?.email}</p>
                    <Badge variant="outline" className="mt-1">{profile?.role?.toUpperCase() || "USER"}</Badge>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Imię i nazwisko</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Dział</Label>
                    <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input value={profile?.email || user?.email || ""} disabled />
                  </div>
                </div>
                <Button onClick={handleSaveProfile} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Zapisywanie..." : "Zapisz zmiany"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Preferencje powiadomień</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: "email", label: "Powiadomienia e-mail", desc: "Otrzymuj podsumowania na e-mail" },
                  { key: "tasks", label: "Zmiany w zadaniach", desc: "Powiadamiaj o zmianach statusu zadań" },
                  { key: "comments", label: "Nowe komentarze", desc: "Powiadamiaj o nowych komentarzach" },
                  { key: "mentions", label: "Wzmianki", desc: "Powiadamiaj gdy ktoś Cię wspomni" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={notifications[item.key as keyof typeof notifications]}
                      onCheckedChange={(v) => setNotifications((p) => ({ ...p, [item.key]: v }))}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Wygląd</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Możesz zmienić motyw za pomocą ikony w górnym pasku nawigacyjnym (☀️/🌙).
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Bezpieczeństwo</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Zmiana hasła</p>
                  <p className="text-xs text-muted-foreground mb-2">Wyślemy link do resetowania hasła na Twój e-mail</p>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const email = profile?.email || user?.email;
                      if (email) {
                        await supabase.auth.resetPasswordForEmail(email);
                        toast.success("Link do resetowania hasła został wysłany");
                      }
                    }}
                  >
                    Wyślij link resetowania
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
