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
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface ContactForm {
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  phone: string;
  password: string;
  is_primary: boolean;
  can_view_all_tickets: boolean;
}

const emptyForm: ContactForm = {
  first_name: "",
  last_name: "",
  email: "",
  position: "",
  phone: "",
  password: "",
  is_primary: false,
  can_view_all_tickets: true,
};

export function ClientContactsTab({ clientId }: { clientId: string }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactForm>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["customer-contacts", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_contacts")
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
    setShowPassword(false);
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
      password: "",
      is_primary: contact.is_primary || false,
      can_view_all_tickets: contact.can_view_all_tickets ?? true,
    });
    setShowPassword(false);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.first_name.trim() && !form.last_name.trim()) {
      toast.error("Podaj imię lub nazwisko");
      return;
    }

    setIsSaving(true);

    try {
      const isPrimary = form.is_primary;
      const canViewAll = isPrimary ? true : form.can_view_all_tickets;

      if (editingId) {
        if (isPrimary) {
          await supabase.from("customer_contacts")
            .update({ is_primary: false })
            .eq("customer_id", clientId)
            .eq("is_primary", true);
        }

        const payload = {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          position: form.position,
          phone: form.phone,
          is_primary: isPrimary,
          can_view_all_tickets: canViewAll,
        };

        const { error } = await supabase.from("customer_contacts")
          .update(payload)
          .eq("id", editingId);
        if (error) { toast.error(error.message); return; }
        toast.success("Kontakt zaktualizowany");
      } else {
        if (!form.email.trim()) {
          toast.error("Email jest wymagany dla nowego kontaktu");
          return;
        }
        if (!form.password.trim() || form.password.length < 6) {
          toast.error("Hasło musi mieć co najmniej 6 znaków");
          return;
        }

        const { data, error } = await supabase.functions.invoke("create-contact-user", {
          body: {
            email: form.email,
            password: form.password,
            first_name: form.first_name,
            last_name: form.last_name,
            phone: form.phone,
            position: form.position,
            client_id: clientId,
            is_primary: isPrimary,
            can_view_all_tickets: canViewAll,
          },
        });

        if (error) {
          toast.error(error.message || "Błąd tworzenia kontaktu");
          return;
        }

        if (data && !data.success) {
          toast.error(data.error || "Błąd tworzenia kontaktu");
          return;
        }

        toast.success("Kontakt dodany i konto użytkownika utworzone");
      }

      queryClient.invalidateQueries({ queryKey: ["customer-contacts", clientId] });
      setShowDialog(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (contactId: string) => {
    const { error } = await supabase.from("customer_contacts")
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
                  <TableHead>Dostęp</TableHead>
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
                      {c.is_primary || c.can_view_all_tickets ? (
                        <Badge variant="outline" className="text-xs">Pełny wgląd</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">Ograniczony</Badge>
                      )}
                    </TableCell>
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
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={!!editingId}
              />
              {editingId && (
                <p className="text-xs text-muted-foreground">Email nie może być zmieniony po utworzeniu konta.</p>
              )}
            </div>

            {!editingId && (
              <div className="space-y-1">
                <Label>Hasło</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Min. 6 znaków"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-10 w-10"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label>Stanowisko</Label>
              <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Telefon</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={form.is_primary}
                  onCheckedChange={(v) => setForm({ ...form, is_primary: !!v, can_view_all_tickets: !!v ? true : form.can_view_all_tickets })}
                />
                <Label className="cursor-pointer">Główny kontakt</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={form.is_primary ? true : form.can_view_all_tickets}
                  disabled={form.is_primary}
                  onCheckedChange={(v) => setForm({ ...form, can_view_all_tickets: !!v })}
                />
                <Label className={`cursor-pointer text-sm ${form.is_primary ? "text-muted-foreground" : ""}`}>
                  Widzi wszystkie zgłoszenia firmy
                </Label>
              </div>
              {form.is_primary && (
                <p className="text-xs text-muted-foreground ml-6">
                  Główny kontakt ma zawsze pełny wgląd we wszystkie zgłoszenia.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Anuluj</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Zapisywanie..." : editingId ? "Zapisz" : "Dodaj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
