import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { getClientStatusColor, getClientStatusLabel } from "@/constants/clientStatuses";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ClientsTableProps {
  clients: any[];
  isLoading: boolean;
}

export function ClientsTable({ clients, isLoading }: ClientsTableProps) {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (client: any) => {
    setDeletingId(client.id);
    const { error } = await supabase.from("clients").delete().eq("id", client.id);
    if (error) {
      toast.error("Błąd usuwania: " + error.message);
      setDeletingId(null);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    toast.success(`Pomyślnie usunięto klienta "${client.name}"`);
    setDeletingId(null);
  };

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
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={7} className="p-0 border-0"><TableSkeleton columns={7} rows={5} /></TableCell></TableRow>
          ) : clients.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Brak klientów</TableCell></TableRow>
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
                  <Badge variant="outline" className={`text-xs ${getClientStatusColor(c.status)}`}>
                    {getClientStatusLabel(c.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{c.score || 0}</TableCell>
                <TableCell className="text-sm">{c.monthly_value ? `${Number(c.monthly_value).toLocaleString("pl-PL")} zł` : "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {c.tags?.map((t: string) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                  </div>
                </TableCell>
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Trwałe usunięcie klienta</AlertDialogTitle>
                        <AlertDialogDescription>
                          Czy na pewno chcesz trwale usunąć klienta <strong>"{c.name}"</strong>? Tej operacji nie można cofnąć.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(c)} disabled={deletingId === c.id} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          {deletingId === c.id ? "Usuwanie..." : "Tak, usuń"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
