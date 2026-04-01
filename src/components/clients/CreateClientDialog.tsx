import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
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

function parseAddress(raw: string) {
  const parts = raw.split(",").map((s) => s.trim());
  const street = parts[0] || "";
  let postal_code = "";
  let city = "";
  if (parts[1]) {
    const match = parts[1].match(/^(\d{2}-\d{3})\s+(.+)$/);
    if (match) {
      postal_code = match[1];
      city = match[2];
    } else {
      city = parts[1];
    }
  }
  return { street, postal_code, city };
}

function titleCase(str: string) {
  return str.toLowerCase().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// Map voivodeship from city/postal code prefix
const postalVoivodeshipMap: Record<string, string> = {
  "00": "mazowieckie", "01": "mazowieckie", "02": "mazowieckie", "03": "mazowieckie", "04": "mazowieckie", "05": "mazowieckie", "06": "mazowieckie", "07": "mazowieckie", "08": "mazowieckie", "09": "mazowieckie",
  "10": "warmińsko-mazurskie", "11": "warmińsko-mazurskie", "12": "warmińsko-mazurskie", "13": "warmińsko-mazurskie", "14": "warmińsko-mazurskie",
  "15": "podlaskie", "16": "podlaskie", "17": "podlaskie", "18": "podlaskie", "19": "podlaskie",
  "20": "lubelskie", "21": "lubelskie", "22": "lubelskie", "23": "lubelskie", "24": "lubelskie",
  "25": "świętokrzyskie", "26": "świętokrzyskie", "27": "świętokrzyskie", "28": "świętokrzyskie", "29": "świętokrzyskie",
  "30": "małopolskie", "31": "małopolskie", "32": "małopolskie", "33": "małopolskie", "34": "małopolskie",
  "35": "podkarpackie", "36": "podkarpackie", "37": "podkarpackie", "38": "podkarpackie", "39": "podkarpackie",
  "40": "śląskie", "41": "śląskie", "42": "śląskie", "43": "śląskie", "44": "śląskie",
  "45": "opolskie", "46": "opolskie", "47": "opolskie", "48": "opolskie", "49": "opolskie",
  "50": "dolnośląskie", "51": "dolnośląskie", "52": "dolnośląskie", "53": "dolnośląskie", "54": "dolnośląskie", "55": "dolnośląskie", "56": "dolnośląskie", "57": "dolnośląskie", "58": "dolnośląskie", "59": "dolnośląskie",
  "60": "wielkopolskie", "61": "wielkopolskie", "62": "wielkopolskie", "63": "wielkopolskie", "64": "wielkopolskie",
  "65": "lubuskie", "66": "lubuskie", "67": "lubuskie", "68": "lubuskie", "69": "lubuskie",
  "70": "zachodniopomorskie", "71": "zachodniopomorskie", "72": "zachodniopomorskie", "73": "zachodniopomorskie", "74": "zachodniopomorskie", "75": "zachodniopomorskie", "76": "zachodniopomorskie", "77": "zachodniopomorskie", "78": "zachodniopomorskie",
  "80": "pomorskie", "81": "pomorskie", "82": "pomorskie", "83": "pomorskie", "84": "pomorskie",
  "85": "kujawsko-pomorskie", "86": "kujawsko-pomorskie", "87": "kujawsko-pomorskie", "88": "kujawsko-pomorskie", "89": "kujawsko-pomorskie",
  "90": "łódzkie", "91": "łódzkie", "92": "łódzkie", "93": "łódzkie", "94": "łódzkie", "95": "łódzkie", "96": "łódzkie", "97": "łódzkie", "98": "łódzkie", "99": "łódzkie",
};

async function fetchCompanyDataByNip(rawNip: string) {
  const nip = rawNip.replace(/[\s-]/g, "");
  if (!/^\d{10}$/.test(nip)) {
    throw new Error("Nieprawidłowy NIP. Wprowadź 10 cyfr.");
  }

  // Use edge function (CEIDG + MF fallback)
  const { data, error } = await supabase.functions.invoke("lookup-nip", {
    body: { nip },
  });

  if (error || !data || data.error) {
    throw new Error(data?.error || "Nie znaleziono firmy dla podanego NIP.");
  }

  // data has: name, contact_person, nip, street, postal_code, city, voivodeship
  const contactParts = (data.contact_person || "").split(" ");
  const first_name = contactParts[0] || "";
  const last_name = contactParts.slice(1).join(" ") || "";

  // If CEIDG returned voivodeship, use it; otherwise fallback to postal code map
  const voivodeship = data.voivodeship
    ? titleCase(data.voivodeship)
    : (data.postal_code ? (postalVoivodeshipMap[data.postal_code.substring(0, 2)] || "") : "");

  return {
    company_name: data.name || "",
    first_name,
    last_name,
    street: data.street || "",
    postal_code: data.postal_code || "",
    city: data.city || "",
    voivodeship,
  };
}

export function CreateClientDialog({ open, onOpenChange, onCreated }: CreateClientDialogProps) {
  const [loading, setLoading] = useState(false);
  const [nipLoading, setNipLoading] = useState(false);
  const firstNameRef = useRef<HTMLInputElement>(null);
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
    has_retainer: false,
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleFetchNip() {
    setNipLoading(true);
    try {
      const data = await fetchCompanyDataByNip(form.nip);
      // ONLY update company fields — never touch first_name / last_name
      setForm((prev) => ({
        ...prev,
        company_name: data.company_name || prev.company_name,
        address: data.street || prev.address,
        postal_code: data.postal_code || prev.postal_code,
        city: data.city || prev.city,
        voivodeship: data.voivodeship || prev.voivodeship,
      }));
      toast.success("Pomyślnie pobrano dane firmy!");
      // Auto-focus the first name field for smooth UX flow
      setTimeout(() => firstNameRef.current?.focus(), 100);
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
          has_retainer: (form as any).has_retainer || false,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Nieznany błąd");

      toast.success("Klient dodany pomyślnie");
      setForm({
        first_name: "", last_name: "", email: "", phone: "", website: "", position: "",
        password: "", password_confirm: "", company_name: "", nip: "", company_phone: "",
        country: "Poland", city: "", address: "", postal_code: "", voivodeship: "", has_retainer: false,
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
              <Input ref={firstNameRef} value={form.first_name} onChange={(e) => updateField("first_name", e.target.value)} />
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
            <div className="flex items-center justify-between rounded-lg border border-input p-3">
              <div>
                <Label className="text-sm font-medium">Stała opieka</Label>
                <p className="text-xs text-muted-foreground">Klient na stałej opiece (retainer)</p>
              </div>
              <Switch
                checked={(form as any).has_retainer || false}
                onCheckedChange={(v) => setForm((prev) => ({ ...prev, has_retainer: v }))}
              />
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
