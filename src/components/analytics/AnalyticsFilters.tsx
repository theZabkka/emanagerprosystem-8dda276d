import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStaffMembers } from "@/hooks/useStaffMembers";

const DATE_RANGES = [
  { value: "7", label: "Ostatnie 7 dni" },
  { value: "30", label: "Ostatnie 30 dni" },
  { value: "90", label: "Ostatnie 90 dni" },
  { value: "365", label: "Ostatni rok" },
];

interface Props {
  days: string;
  setDays: (v: string) => void;
  projectId: string;
  setProjectId: (v: string) => void;
  userId: string;
  setUserId: (v: string) => void;
  projects: { id: string; name: string }[];
}

export function AnalyticsFilters({ days, setDays, projectId, setProjectId, userId, setUserId, projects }: Props) {
  const { data: staff } = useStaffMembers();

  return (
    <div className="flex flex-wrap gap-3">
      <Select value={days} onValueChange={setDays}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGES.map((r) => (
            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={projectId} onValueChange={setProjectId}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Wszystkie projekty" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Wszystkie projekty</SelectItem>
          {(projects || []).map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={userId} onValueChange={setUserId}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Wszyscy członkowie" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Wszyscy członkowie</SelectItem>
          {(staff || []).map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.full_name || s.email || "—"}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
