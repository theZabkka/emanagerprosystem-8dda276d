import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

const statusLabels: Record<string, string> = {
  active: "Aktywny", potential: "Potencjalny", negotiations: "Negocjacje", project: "Projekt", inactive: "Nieaktywny",
};
const statusColors: Record<string, string> = {
  active: "bg-success/15 text-foreground", potential: "bg-info/15 text-info-foreground",
  negotiations: "bg-warning/15 text-warning-foreground", project: "bg-primary/15 text-primary",
  inactive: "bg-muted text-muted-foreground",
};

interface ClientsTableProps {
  clients: any[];
  isLoading: boolean;
}

export function ClientsTable({ clients, isLoading }: ClientsTableProps) {
  return (
    <div className="bg-card rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Firma</TableHead>
            <TableHead>Kontakt</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Wynik</TableHead>
            <TableHead>Wartość mies.</TableHead>
            <TableHead>Tagi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Ładowanie...</TableCell></TableRow>
          ) : clients.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Brak klientów</TableCell></TableRow>
          ) : (
            clients.map((c: any) => (
              <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell className="font-medium">
                  <Link to={`/clients/${c.id}`} className="hover:text-primary hover:underline">{c.name}</Link>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm">{c.contact_person || "—"}</p>
                    <p className="text-xs text-muted-foreground">{c.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={`text-xs ${statusColors[c.status] || ""}`}>
                    {statusLabels[c.status] || c.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{c.score || 0}</TableCell>
                <TableCell className="text-sm">{c.monthly_value ? `${Number(c.monthly_value).toLocaleString("pl-PL")} zł` : "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {c.tags?.map((t: string) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
