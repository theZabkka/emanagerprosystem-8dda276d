import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RankingRow {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  total_tasks_completed: number;
  total_rejections: number;
  quality_score_percentage: number;
}

type SortKey = "full_name" | "total_tasks_completed" | "total_rejections" | "quality_score_percentage";

interface Props {
  fromDate: string;
  projectId: string | null;
}

export function QualityRankingTable({ fromDate, projectId }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("quality_score_percentage");
  const [sortAsc, setSortAsc] = useState(false);

  const { data: ranking, isLoading } = useQuery({
    queryKey: ["quality-ranking", fromDate, projectId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_individual_quality_ranking", {
        _from_date: fromDate,
        _to_date: new Date().toISOString(),
        _project_id: projectId,
      } as any);
      if (error) throw error;
      return (data || []) as RankingRow[];
    },
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "full_name");
    }
  };

  const sorted = [...(ranking || [])].sort((a, b) => {
    const dir = sortAsc ? 1 : -1;
    if (sortKey === "full_name") {
      return dir * (a.full_name || "").localeCompare(b.full_name || "");
    }
    return dir * ((a[sortKey] as number) - (b[sortKey] as number));
  });

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-600 bg-emerald-500/10";
    if (score >= 75) return "text-amber-600 bg-amber-500/10";
    return "text-destructive bg-destructive/10";
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 font-medium text-muted-foreground hover:text-foreground"
      onClick={() => handleSort(field)}
    >
      {label}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Indywidualny Ranking Jakości
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-12">Ładowanie…</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">Brak danych w wybranym okresie</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><SortHeader label="Pracownik" field="full_name" /></TableHead>
                <TableHead className="text-right"><SortHeader label="Ukończone" field="total_tasks_completed" /></TableHead>
                <TableHead className="text-right"><SortHeader label="Poprawki" field="total_rejections" /></TableHead>
                <TableHead className="text-right"><SortHeader label="Wsp. jakości" field="quality_score_percentage" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row) => (
                <TableRow key={row.user_id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={row.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {(row.full_name || "?").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{row.full_name || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">{row.total_tasks_completed}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className="text-xs">{row.total_rejections}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className={`text-xs font-bold ${getScoreColor(row.quality_score_percentage)}`}>
                      {row.quality_score_percentage}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
