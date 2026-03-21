import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";

const voivodeships = [
  "dolnośląskie", "kujawsko-pomorskie", "lubelskie", "lubuskie",
  "łódzkie", "małopolskie", "mazowieckie", "opolskie",
  "podkarpackie", "podlaskie", "pomorskie", "śląskie",
  "świętokrzyskie", "warmińsko-mazurskie", "wielkopolskie", "zachodniopomorskie",
];

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

async function fetchCompanyDataByNip(rawNip: string) {
  const nip = rawNip.replace(/[\s-]/g, "");
  if (!/^\d{10}$/.test(nip)) {
    throw new Error("Nieprawidłowy NIP. Wprowadź 10 cyfr.");
  }
  const today = new Date().toISOString().slice(0, 10);
  const res = await fetch(`https://wl-api.mf.gov.pl/api/search/nip/${nip}?date=${today}`);
  if (!res.ok) throw new Error("API nie odpowiada");
  const json = await res.json();
  const subject = json?.result?.subject;
  if (!subject) throw new Error("Nie znaleziono firmy dla podanego NIP.");
  return {
    name: subject.name || "",
    address: subject.workingAddress || subject.residenceAddress || "",
  };
}

export function CreateClientDialog({ open, onOpenChange, onCreated }: CreateClientDialogProps) {
  const [loading, setLoading] = useState(false);
  const [nipLoading, setNipLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    website: "",
    position: "",
    password: "",
    password_confirm: "",
    company_name: "",
    nip: "",
    company_phone: "",
    country: "Poland",
    city: "",
    address: "",
    postal_code: "",
    voivodeship: "",
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleFetchNip() {
    setNipLoading(true);
    try {
      const data = await fetchCompanyDataByNip(form.nip);
      setForm((prev) => ({
        ...prev,
        company_name: data.name || prev.company_name,
        address: data.address || prev.address,
      }));
      toast.success("Pomyślnie pobrano dane firmy!");
    } catch (err: any) {
      if (err.message.includes("Nieprawidłowy NIP")) {
        toast.error(err.message);
      } else {
        toast.warning("Nie udało się pobrać danych z bazy. Uzupełnij formularz ręcznie.");
      }
    } finally {
      setNipLoading(false);
    }
  }

  async function handleCreate() {
    if (!form.first_name.trim()) { toast.error("Podaj imię"); return; }
    if (!form.last_name.trim()) { toast.error("Podaj nazwisko"); return; }
    if (!form.email.trim()) { toast.error("Podaj adres e-mail"); return; }
    if (!form.phone.trim()) { toast.error("Podaj telefon"); return; }
    if (!form.position.trim()) { toast.error("Podaj stanowisko"); return; }
    if (!form.password.trim()) { toast.error("Podaj hasło"); return; }
    if (form.password.length < 6) { toast.error("Hasło musi mieć min. 6 znaków"); return; }
    if (form.password !== form.password_confirm) { toast.error("Hasła nie są identyczne"); return; }
    if (!form.company_name.trim()) { toast.error("Podaj nazwę firmy"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-client-user", {
        body: {
          email: form.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          website: form.website,
          position: form.position,
          company_name: form.company_name,
          nip: form.nip,
          company_phone: form.company_phone,
          country: form.country,
          city: form.city,
          address: form.address,
          postal_code: form.postal_code,
          voivodeship: form.voivodeship,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Nieznany błąd");

      toast.success("Klient dodany pomyślnie");
      setForm({
        first_name: "", last_name: "", email: "", phone: "", website: "", position: "",
        password: "", password_confirm: "", company_name: "", nip: "", company_phone: "",
        country: "Poland", city: "", address: "", postal_code: "", voivodeship: "",
      });
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      toast.error("Błąd", { description: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nowy klient</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {/* Left column - contact info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Informacje o kontakcie</h3>
            <div className="space-y-2">
              <Label>Imię <span className="text-destructive">*</span></Label>
              <Input value={form.first_name} onChange={(e) => updateField("first_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nazwisko <span className="text-destructive">*</span></Label>
              <Input value={form.last_name} onChange={(e) => updateField("last_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Adres e-mail <span className="text-destructive">*</span></Label>
              <Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Telefon <span className="text-destructive">*</span></Label>
              <Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Strona internetowa</Label>
              <Input value={form.website} onChange={(e) => updateField("website", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Stanowisko <span className="text-destructive">*</span></Label>
              <Input value={form.position} onChange={(e) => updateField("position", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hasło <span className="text-destructive">*</span></Label>
              <Input type="password" value={form.password} onChange={(e) => updateField("password", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Powtórz hasło <span className="text-destructive">*</span></Label>
              <Input type="password" value={form.password_confirm} onChange={(e) => updateField("password_confirm", e.target.value)} />
            </div>
          </div>

          {/* Right column - company info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Informacje o firmie</h3>
            <div className="space-y-2">
              <Label>NIP</Label>
              <div className="flex gap-2">
                <Input
                  value={form.nip}
                  onChange={(e) => updateField("nip", e.target.value)}
                  placeholder="np. 1234567890"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFetchNip}
                  disabled={nipLoading || !form.nip.trim()}
                  className="shrink-0 h-10 px-3 gap-1.5"
                >
                  {nipLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Pobierz z bazy
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pełna nazwa firmy <span className="text-destructive">*</span></Label>
              <Input value={form.company_name} onChange={(e) => updateField("company_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Telefon firmowy</Label>
              <Input value={form.company_phone} onChange={(e) => updateField("company_phone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Kraj</Label>
              <Input value={form.country} onChange={(e) => updateField("country", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Miasto</Label>
              <Input value={form.city} onChange={(e) => updateField("city", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Adres</Label>
              <Input value={form.address} onChange={(e) => updateField("address", e.target.value)} />
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
          </div>
        </div>

        <Button onClick={handleCreate} className="w-full mt-4" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Dodaj klienta
        </Button>
      </DialogContent>
    </Dialog>
  );
}
