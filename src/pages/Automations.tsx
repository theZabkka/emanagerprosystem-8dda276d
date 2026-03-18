import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Bot, Zap, Mail, Bell, Clock, FileText, Users, TrendingUp, Plus,
} from "lucide-react";

const AUTOMATIONS = [
  {
    id: "1",
    name: "Powiadomienie o zaległym zadaniu",
    description: "Wyślij powiadomienie gdy zadanie przekroczy termin o 24h",
    icon: Bell,
    trigger: "Termin + 24h",
    action: "Powiadomienie e-mail",
    active: true,
    runs: 47,
  },
  {
    id: "2",
    name: "Automatyczne przypisanie recenzenta",
    description: "Przypisz recenzenta gdy zadanie zmieni status na 'review'",
    icon: Users,
    trigger: "Status → Review",
    action: "Przypisz recenzenta",
    active: true,
    runs: 123,
  },
  {
    id: "3",
    name: "Raport tygodniowy",
    description: "Generuj i wyślij raport tygodniowy w każdy poniedziałek",
    icon: FileText,
    trigger: "Poniedziałek 8:00",
    action: "E-mail z raportem",
    active: false,
    runs: 12,
  },
  {
    id: "4",
    name: "Powiadomienie o nowym kliencie",
    description: "Wyślij powiadomienie zespołowi gdy pojawi się nowy klient",
    icon: TrendingUp,
    trigger: "Nowy klient",
    action: "Wiadomość na kanale",
    active: true,
    runs: 8,
  },
  {
    id: "5",
    name: "Eskalacja zadań krytycznych",
    description: "Eskaluj zadanie jeśli priorytet krytyczny i brak aktywności przez 4h",
    icon: Zap,
    trigger: "Krytyczny + 4h brak aktywności",
    action: "Powiadomienie managera",
    active: true,
    runs: 5,
  },
  {
    id: "6",
    name: "Podsumowanie dnia",
    description: "Wyślij podsumowanie dziennych aktywności o 18:00",
    icon: Clock,
    trigger: "Codziennie 18:00",
    action: "E-mail podsumowanie",
    active: false,
    runs: 0,
  },
];

export default function Automations() {
  return (
    <AppLayout title="Automatyzacje">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Zarządzaj automatycznymi procesami w systemie
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nowa automatyzacja
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AUTOMATIONS.map((auto) => (
            <Card key={auto.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <auto.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{auto.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{auto.description}</p>
                    </div>
                  </div>
                  <Switch checked={auto.active} />
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline" className="text-[10px]">
                    Wyzwalacz: {auto.trigger}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    Akcja: {auto.action}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    Wykonań: {auto.runs}
                  </span>
                  <Badge variant={auto.active ? "default" : "secondary"} className="text-[10px]">
                    {auto.active ? "Aktywna" : "Wyłączona"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
