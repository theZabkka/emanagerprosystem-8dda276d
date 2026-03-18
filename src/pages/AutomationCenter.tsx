import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Workflow, Zap, Mail, MessageCircle, FileText, Clock, Users,
  TrendingUp, CheckSquare, Bot, ArrowRight, Plus,
} from "lucide-react";

const TRIGGERS = [
  { icon: CheckSquare, name: "Zmiana statusu zadania", desc: "Gdy status zadania się zmieni" },
  { icon: Clock, name: "Termin zadania", desc: "Gdy zbliża się lub mija termin" },
  { icon: Users, name: "Nowy klient", desc: "Gdy zostanie dodany nowy klient" },
  { icon: TrendingUp, name: "Zmiana etapu lejka", desc: "Gdy deal zmieni etap w lejku" },
  { icon: MessageCircle, name: "Nowy komentarz", desc: "Gdy dodany zostanie komentarz" },
  { icon: FileText, name: "Harmonogram", desc: "O określonej porze / cyklicznie" },
];

const ACTIONS = [
  { icon: Mail, name: "Wyślij e-mail", desc: "Wyślij powiadomienie e-mail" },
  { icon: MessageCircle, name: "Wiadomość na kanale", desc: "Wyślij wiadomość w komunikatorze" },
  { icon: Users, name: "Przypisz osobę", desc: "Automatycznie przypisz użytkownika" },
  { icon: CheckSquare, name: "Zmień status", desc: "Automatycznie zmień status zadania" },
  { icon: Bot, name: "Wywołaj AI", desc: "Uruchom analizę AI" },
  { icon: FileText, name: "Generuj raport", desc: "Stwórz i wyślij raport" },
];

const TEMPLATES = [
  { name: "Onboarding klienta", desc: "Automatyczny proces wdrożenia nowego klienta", triggers: 3, actions: 5 },
  { name: "QA workflow", desc: "Automatyczna weryfikacja jakości zadań", triggers: 2, actions: 4 },
  { name: "Raportowanie tygodniowe", desc: "Cotygodniowe podsumowanie aktywności", triggers: 1, actions: 2 },
  { name: "Eskalacja zadań", desc: "Automatyczna eskalacja zaległych zadań", triggers: 2, actions: 3 },
];

export default function AutomationCenter() {
  return (
    <AppLayout title="Centrum automatyzacji">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Twórz nowe automatyzacje z gotowych bloków
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Stwórz automatyzację
          </Button>
        </div>

        <Tabs defaultValue="templates">
          <TabsList>
            <TabsTrigger value="templates">Szablony</TabsTrigger>
            <TabsTrigger value="triggers">Wyzwalacze</TabsTrigger>
            <TabsTrigger value="actions">Akcje</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TEMPLATES.map((t) => (
                <Card key={t.name} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Workflow className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{t.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                        <div className="flex items-center gap-2 mt-3">
                          <Badge variant="outline" className="text-[10px]">{t.triggers} wyzwalaczy</Badge>
                          <Badge variant="secondary" className="text-[10px]">{t.actions} akcji</Badge>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-4">
                      Użyj szablonu
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="triggers" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TRIGGERS.map((t) => (
                <Card key={t.name} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="pt-6 text-center">
                    <div className="inline-flex p-3 rounded-lg bg-primary/10 mb-3">
                      <t.icon className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="actions" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ACTIONS.map((a) => (
                <Card key={a.name} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="pt-6 text-center">
                    <div className="inline-flex p-3 rounded-lg bg-primary/10 mb-3">
                      <a.icon className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">{a.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{a.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
