import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ContactForm {
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  phone: string;
  is_primary: boolean;
}

const emptyForm: ContactForm = {
  first_name: "",
  last_name: "",
  email: "",
  position: "",
  phone: "",
  is_primary: false,
};

export function ClientContactsTab({ clientId }: { clientId: string }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactForm>(emptyForm);

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["customer-contacts", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_contacts" as any)
        .select("*")
        .eq("customer_id", clientId)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (contact: any) => {
    setEditingId(contact.id);
    setForm({
      first_name: contact.first_name || "",
      last_name: contact.last_name || "",
      email: contact.email || "",
      position: contact.position || "",
      phone: contact.phone || "",
      is_primary: contact.is_primary || false,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.first_name.trim() && !form.last_name.trim()) {
      toast.error("Podaj imię lub nazwisko");
      return;
    }

    if (editingId) {
      const { error } = await (supabase.from("customer_contacts" as any) as any)
        .update({ ...form })
        .eq("id", editingId);
      if (error) { toast.error(error.message); return; }
      toast.success("Kontakt zaktualizowany");
    } else {
      const { error } = await (supabase.from("customer_contacts" as any) as any)
        .insert({ customer_id: clientId, ...form });
      if (error) { toast.error(error.message); return; }
      toast.success("Kontakt dodany");
    }

    queryClient.invalidateQueries({ queryKey: ["customer-contacts", clientId] });
    setShowDialog(false);
  };

  const handleDelete = async (contactId: string) => {
    const { error } = await (supabase.from("customer_contacts" as any) as any)
      .delete()
      .eq("id", contactId);
    if (error) { toast.error(error.message); return; }
    toast.success("Kontakt usunięty");
    queryClient.invalidateQueries({ queryKey: ["customer-contacts", clientId] });
  };

  if (isLoading) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Ładowanie...</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Nowy Kontakt
        </Button>
      </div>

      {(!contacts || contacts.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            Brak przypisanych kontaktów
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imię i Nazwisko</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Stanowisko</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead className="w-24">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.first_name} {c.last_name}
                      {c.is_primary && (
                        <Badge variant="secondary" className="ml-2 text-xs">Główny</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.position || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(c.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edytuj kontakt" : "Nowy kontakt"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Imię</Label>
                <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Nazwisko</Label>
                <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Stanowisko</Label>
              <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Telefon</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.is_primary}
                onCheckedChange={(v) => setForm({ ...form, is_primary: !!v })}
              />
              <Label className="cursor-pointer">Główny kontakt</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Anuluj</Button>
            <Button onClick={handleSave}>{editingId ? "Zapisz" : "Dodaj"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
