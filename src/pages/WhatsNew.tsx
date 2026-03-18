import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Rocket, Bug, Wrench, Star } from "lucide-react";

const UPDATES = [
  {
    date: "2026-03-18",
    version: "v1.2.0",
    items: [
      { type: "feature", icon: Rocket, text: "Komunikator z funkcjami real-time (presence, typing, reakcje)" },
      { type: "feature", icon: Rocket, text: "Cele i OKR z kluczowymi rezultatami" },
      { type: "feature", icon: Rocket, text: "Tablica operacyjna Kanban" },
      { type: "feature", icon: Rocket, text: "Kalendarz zespołu z widokiem zadań" },
      { type: "feature", icon: Rocket, text: "Raporty czasu pracy" },
      { type: "improvement", icon: Wrench, text: "Poprawki bezpieczeństwa RLS" },
    ],
  },
  {
    date: "2026-03-17",
    version: "v1.1.0",
    items: [
      { type: "feature", icon: Rocket, text: "Moduł Zadania z widokiem szczegółowym" },
      { type: "feature", icon: Rocket, text: "Moduł Klienci z filtrowaniem" },
      { type: "feature", icon: Rocket, text: "Lejek sprzedaży (Pipeline)" },
      { type: "feature", icon: Rocket, text: "Komentarze i logowanie czasu w zadaniach" },
      { type: "improvement", icon: Wrench, text: "Subzadania i listy kontrolne" },
    ],
  },
  {
    date: "2026-03-16",
    version: "v1.0.0",
    items: [
      { type: "feature", icon: Star, text: "Pierwsza wersja EMANAGER.PRO" },
      { type: "feature", icon: Rocket, text: "Logowanie i autentykacja Supabase" },
      { type: "feature", icon: Rocket, text: "Dashboard z alertami i statystykami" },
      { type: "feature", icon: Rocket, text: "Sidebar z pełną nawigacją" },
    ],
  },
];

const TYPE_COLORS: Record<string, string> = {
  feature: "bg-primary/10 text-primary",
  improvement: "bg-yellow-500/10 text-yellow-700",
  fix: "bg-destructive/10 text-destructive",
};

export default function WhatsNew() {
  return (
    <AppLayout title="Co nowego">
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <p className="text-sm text-muted-foreground">Historia zmian i nowych funkcji</p>
        </div>

        {UPDATES.map((update) => (
          <Card key={update.version}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="default">{update.version}</Badge>
                <span className="text-sm text-muted-foreground">{update.date}</span>
              </div>
              <div className="space-y-3">
                {update.items.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`p-1.5 rounded ${TYPE_COLORS[item.type] || ""}`}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm text-foreground">{item.text}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
