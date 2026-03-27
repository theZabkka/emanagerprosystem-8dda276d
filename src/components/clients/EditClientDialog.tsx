import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const voivodeships = [
  "dolnośląskie", "kujawsko-pomorskie", "lubelskie", "lubuskie",
  "łódzkie", "małopolskie", "mazowieckie", "opolskie",
  "podkarpackie", "podlaskie", "pomorskie", "śląskie",
  "świętokrzyskie", "warmińsko-mazurskie", "wielkopolskie", "zachodniopomorskie",
];

import { CLIENT_STATUS_GROUPS } from "@/constants/clientStatuses";

interface EditClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: any;
  onUpdated: () => void;
}

export function EditClientDialog({ open, onOpenChange, client, onUpdated }: EditClientDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    nip: "",
    status: "Nowy kontakt",
    address: "",
    city: "",
    postal_code: "",
    voivodeship: "",
    country: "Poland",
    monthly_value: "",
    has_retainer: false,
  });

  useEffect(() => {
    if (client && open) {
      setForm({
        name: client.name || "",
        contact_person: client.contact_person || "",
        email: client.email || "",
        phone: client.phone || "",
        nip: client.nip || "",
        status: client.status || "Nowy kontakt",
        address: client.address || "",
        city: client.city || "",
        postal_code: client.postal_code || "",
        voivodeship: client.voivodeship || "",
        country: client.country || "Poland",
        monthly_value: client.monthly_value?.toString() || "0",
        has_retainer: client.has_retainer || false,
      });
    }
  }, [client, open]);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Podaj nazwę firmy"); return; }
    setLoading(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({
          name: form.name,
          contact_person: form.contact_person || null,
          email: form.email || null,
          phone: form.phone || null,
          nip: form.nip || null,
          status: form.status as any,
          address: form.address || null,
          city: form.city || null,
          postal_code: form.postal_code || null,
          voivodeship: form.voivodeship || null,
          country: form.country || null,
          monthly_value: form.monthly_value ? Number(form.monthly_value) : 0,
          has_retainer: form.has_retainer,
        })
        .eq("id", client.id);

      if (error) throw error;
      toast.success("Dane klienta zaktualizowane");
      onOpenChange(false);
      onUpdated();
    } catch (err: any) {
      toast.error("Błąd zapisu: " + (err.message || "Nieznany"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edytuj klienta</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Dane kontaktowe</h3>
            <div className="space-y-2">
              <Label>Nazwa firmy <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Osoba kontaktowa</Label>
              <Input value={form.contact_person} onChange={(e) => updateField("contact_person", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>NIP</Label>
              <Input value={form.nip} onChange={(e) => updateField("nip", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => updateField("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLIENT_STATUS_GROUPS.map((group) => (
                    <div key={group.name}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{group.name}</div>
                      {group.statuses.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Adres i wartość</h3>
            <div className="space-y-2">
              <Label>Adres</Label>
              <Input value={form.address} onChange={(e) => updateField("address", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Miasto</Label>
              <Input value={form.city} onChange={(e) => updateField("city", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Kod pocztowy</Label>
              <Input value={form.postal_code} onChange={(e) => updateField("postal_code", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Województwo</Label>
              <Select value={form.voivodeship} onValueChange={(v) => updateField("voivodeship", v)}>
                <SelectTrigger><SelectValue placeholder="Wybierz..." /></SelectTrigger>
                <SelectContent>
                  {voivodeships.map((v) => (
                    <SelectItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kraj</Label>
              <Input value={form.country} onChange={(e) => updateField("country", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Wartość miesięczna (PLN)</Label>
              <Input type="number" value={form.monthly_value} onChange={(e) => updateField("monthly_value", e.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-input p-3">
              <div>
                <Label className="text-sm font-medium">Stała opieka</Label>
                <p className="text-xs text-muted-foreground">Klient na stałej opiece (retainer)</p>
              </div>
              <Switch
                checked={form.has_retainer}
                onCheckedChange={(v) => setForm((prev) => ({ ...prev, has_retainer: v }))}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Anuluj</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Zapisz zmiany
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
