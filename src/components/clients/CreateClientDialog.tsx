import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useDataSource } from "@/hooks/useDataSource";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  active: "Aktywny", potential: "Potencjalny", negotiations: "Negocjacje", project: "Projekt", inactive: "Nieaktywny",
};

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateClientDialog({ open, onOpenChange, onCreated }: CreateClientDialogProps) {
  const { isDemo } = useDataSource();
  const [form, setForm] = useState({
    name: "", contact_person: "", email: "", phone: "", status: "potential", monthly_value: "",
  });

  async function handleCreate() {
    if (!form.name.trim()) { toast.error("Podaj nazwę firmy"); return; }
    if (isDemo) { toast.info("W trybie demo nie można dodawać klientów"); return; }

    const { error } = await supabase.from("clients").insert({
      name: form.name, contact_person: form.contact_person, email: form.email,
      phone: form.phone, status: form.status as any,
      monthly_value: form.monthly_value ? parseFloat(form.monthly_value) : 0,
    });
    if (error) { toast.error("Błąd", { description: error.message }); return; }

    toast.success("Klient dodany");
    setForm({ name: "", contact_person: "", email: "", phone: "", status: "potential", monthly_value: "" });
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nowy klient</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Firma *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-2"><Label>Osoba kontaktowa</Label><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Telefon</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Wartość mies.</Label><Input type="number" value={form.monthly_value} onChange={(e) => setForm({ ...form, monthly_value: e.target.value })} /></div>
          </div>
          <Button onClick={handleCreate} className="w-full">Dodaj klienta</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
