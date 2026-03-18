import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Target, Plus, ChevronDown, ChevronRight, TrendingUp } from "lucide-react";

interface KeyResult {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;
}

interface Objective {
  id: string;
  title: string;
  description: string;
  quarter: string;
  owner: string;
  keyResults: KeyResult[];
  expanded: boolean;
}

const MOCK_OBJECTIVES: Objective[] = [
  {
    id: "1",
    title: "Zwiększyć przychody z nowych klientów",
    description: "Skupienie na pozyskiwaniu nowych klientów B2B w Q1",
    quarter: "Q1 2026",
    owner: "Zespół Sprzedaży",
    expanded: true,
    keyResults: [
      { id: "kr1", title: "Pozyskać 15 nowych klientów", current: 8, target: 15, unit: "klientów" },
      { id: "kr2", title: "Wartość lejka > 500k PLN", current: 320000, target: 500000, unit: "PLN" },
      { id: "kr3", title: "Konwersja leadów > 25%", current: 18, target: 25, unit: "%" },
    ],
  },
  {
    id: "2",
    title: "Poprawić jakość dostarczanych projektów",
    description: "Redukcja poprawek i zwiększenie satysfakcji klientów",
    quarter: "Q1 2026",
    owner: "Zespół Produkcji",
    expanded: true,
    keyResults: [
      { id: "kr4", title: "Zmniejszyć poprawki do < 10%", current: 15, target: 10, unit: "%" },
      { id: "kr5", title: "NPS klientów > 8.5", current: 7.8, target: 8.5, unit: "pkt" },
      { id: "kr6", title: "Czas realizacji zadań < 3 dni", current: 4.2, target: 3, unit: "dni" },
    ],
  },
  {
    id: "3",
    title: "Rozwinąć kompetencje zespołu",
    description: "Szkolenia, certyfikaty i rozwój wewnętrzny",
    quarter: "Q1 2026",
    owner: "HR",
    expanded: false,
    keyResults: [
      { id: "kr7", title: "100% ukończonych planów rozwoju", current: 60, target: 100, unit: "%" },
      { id: "kr8", title: "4 szkolenia wewnętrzne", current: 2, target: 4, unit: "szt" },
    ],
  },
];

export default function OKR() {
  const [objectives, setObjectives] = useState(MOCK_OBJECTIVES);
  const [selectedQuarter, setSelectedQuarter] = useState("Q1 2026");

  const toggleExpanded = (id: string) => {
    setObjectives((prev) =>
      prev.map((o) => (o.id === id ? { ...o, expanded: !o.expanded } : o))
    );
  };

  const getProgress = (kr: KeyResult) => {
    if (kr.unit === "%" || kr.unit === "pkt" || kr.unit === "dni") {
      // For "less is better" metrics like days or corrections percentage
      if (kr.target < kr.current && (kr.unit === "%" || kr.unit === "dni")) {
        const total = kr.current;
        const remaining = kr.current - kr.target;
        return Math.max(0, Math.min(100, ((total - remaining) / total) * 100));
      }
      return Math.min(100, (kr.current / kr.target) * 100);
    }
    return Math.min(100, (kr.current / kr.target) * 100);
  };

  const getObjectiveProgress = (obj: Objective) => {
    if (obj.keyResults.length === 0) return 0;
    return obj.keyResults.reduce((sum, kr) => sum + getProgress(kr), 0) / obj.keyResults.length;
  };

  const overallProgress =
    objectives.length > 0
      ? objectives.reduce((sum, o) => sum + getObjectiveProgress(o), 0) / objectives.length
      : 0;

  return (
    <AppLayout title="Cele i OKR">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Q1 2026">Q1 2026</SelectItem>
                <SelectItem value="Q2 2026">Q2 2026</SelectItem>
                <SelectItem value="Q3 2026">Q3 2026</SelectItem>
                <SelectItem value="Q4 2026">Q4 2026</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Dodaj cel
          </Button>
        </div>

        {/* Overall progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">Postęp ogólny — {selectedQuarter}</span>
              </div>
              <span className="text-sm font-medium text-foreground">{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {objectives.length} celów · {objectives.reduce((s, o) => s + o.keyResults.length, 0)} kluczowych rezultatów
            </p>
          </CardContent>
        </Card>

        {/* Objectives */}
        <div className="space-y-4">
          {objectives.map((obj) => {
            const progress = getObjectiveProgress(obj);
            return (
              <Card key={obj.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <button onClick={() => toggleExpanded(obj.id)} className="mt-1 text-muted-foreground hover:text-foreground">
                        {obj.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Target className="h-4 w-4 text-primary" />
                          <CardTitle className="text-base">{obj.title}</CardTitle>
                        </div>
                        <p className="text-sm text-muted-foreground">{obj.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{obj.quarter}</Badge>
                          <Badge variant="secondary">{obj.owner}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <span className="text-2xl font-bold text-foreground">{Math.round(progress)}%</span>
                    </div>
                  </div>
                  <Progress value={progress} className="h-2 mt-3" />
                </CardHeader>

                {obj.expanded && (
                  <CardContent className="pt-0">
                    <div className="space-y-3 ml-7">
                      {obj.keyResults.map((kr) => {
                        const krProgress = getProgress(kr);
                        return (
                          <div key={kr.id} className="border border-border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-foreground">{kr.title}</span>
                              <span className="text-sm text-muted-foreground">
                                {kr.current.toLocaleString("pl-PL")} / {kr.target.toLocaleString("pl-PL")} {kr.unit}
                              </span>
                            </div>
                            <Progress value={krProgress} className="h-1.5" />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
