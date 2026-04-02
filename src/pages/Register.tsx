import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Search, ArrowLeft } from "lucide-react";
import { ThemeLogo } from "@/components/ThemeLogo";

const voivodeships = [
  "dolnośląskie", "kujawsko-pomorskie", "lubelskie", "lubuskie",
  "łódzkie", "małopolskie", "mazowieckie", "opolskie",
  "podkarpackie", "podlaskie", "pomorskie", "śląskie",
  "świętokrzyskie", "warmińsko-mazurskie", "wielkopolskie", "zachodniopomorskie",
];

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

function titleCase(str: string) {
  return str.toLowerCase().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [nipLoading, setNipLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    password_confirm: "",
    company_name: "",
    nip: "",
    city: "",
    address: "",
    postal_code: "",
    voivodeship: "",
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleFetchNip() {
    const nip = form.nip.replace(/[\s-]/g, "");
    if (!/^\d{10}$/.test(nip)) {
      toast.error("Nieprawidłowy NIP. Wprowadź 10 cyfr.");
      return;
    }
    setNipLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("register-client", {
        body: { action: "lookup-nip", nip },
      });
      if (error || !data || data.error) {
        toast.warning("Nie udało się pobrać danych z bazy. Uzupełnij formularz ręcznie.");
        return;
      }

      const contactParts = (data.contact_person || "").split(" ");
      const voivodeship = data.voivodeship
        ? titleCase(data.voivodeship)
        : (data.postal_code ? (postalVoivodeshipMap[data.postal_code.substring(0, 2)] || "") : "");

      setForm((prev) => ({
        ...prev,
        first_name: contactParts[0] || prev.first_name,
        last_name: contactParts.slice(1).join(" ") || prev.last_name,
        company_name: data.name || prev.company_name,
        address: data.street || prev.address,
        postal_code: data.postal_code || prev.postal_code,
        city: data.city || prev.city,
        voivodeship: voivodeship || prev.voivodeship,
      }));
      toast.success("Pomyślnie pobrano dane firmy!");
    } catch {
      toast.warning("Nie udało się pobrać danych z bazy. Uzupełnij formularz ręcznie.");
    } finally {
      setNipLoading(false);
    }
  }

  async function handleRegister() {
    if (!form.email.trim()) { toast.error("Podaj adres e-mail"); return; }
    if (!form.password.trim()) { toast.error("Podaj hasło"); return; }
    if (form.password.length < 6) { toast.error("Hasło musi mieć min. 6 znaków"); return; }
    if (form.password !== form.password_confirm) { toast.error("Hasła nie są identyczne"); return; }
    if (!form.first_name.trim()) { toast.error("Podaj imię"); return; }
    if (!form.last_name.trim()) { toast.error("Podaj nazwisko"); return; }
    if (!form.company_name.trim()) { toast.error("Podaj nazwę firmy"); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("register-client", {
        body: {
          action: "register",
          email: form.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
          company_name: form.company_name,
          nip: form.nip,
          address: form.address,
          postal_code: form.postal_code,
          city: form.city,
          voivodeship: form.voivodeship,
          phone: form.phone,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Nieznany błąd");

      // Auto-login
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (signInErr) {
        toast.success("Rejestracja zakończona sukcesem! Zaloguj się swoimi danymi.");
        navigate("/login");
      } else {
        toast.success("Rejestracja zakończona sukcesem! Witamy w panelu klienta.");
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast.error("Błąd rejestracji", { description: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-card rounded-xl shadow-lg p-6 md:p-8 space-y-6">
          <div className="text-center space-y-3">
            <ThemeLogo className="h-9 w-auto mx-auto" />
            <p className="text-sm text-muted-foreground">Rejestracja nowego klienta</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {/* Left column - account & contact */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Dane konta i kontaktu</h3>
              <div className="space-y-2">
                <Label>E-mail <span className="text-destructive">*</span></Label>
                <Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="twoj@email.pl" />
              </div>
              <div className="space-y-2">
                <Label>Hasło <span className="text-destructive">*</span></Label>
                <Input type="password" value={form.password} onChange={(e) => updateField("password", e.target.value)} placeholder="Min. 6 znaków" />
              </div>
              <div className="space-y-2">
                <Label>Powtórz hasło <span className="text-destructive">*</span></Label>
                <Input type="password" value={form.password_confirm} onChange={(e) => updateField("password_confirm", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Imię <span className="text-destructive">*</span></Label>
                <Input value={form.first_name} onChange={(e) => updateField("first_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Nazwisko <span className="text-destructive">*</span></Label>
                <Input value={form.last_name} onChange={(e) => updateField("last_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
              </div>
            </div>

            {/* Right column - company info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Dane firmy</h3>
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
                    <span className="hidden sm:inline">Pobierz z bazy</span>
                    <span className="sm:hidden">Pobierz</span>
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Pełna nazwa firmy <span className="text-destructive">*</span></Label>
                <Input value={form.company_name} onChange={(e) => updateField("company_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Adres</Label>
                <Input value={form.address} onChange={(e) => updateField("address", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Kod pocztowy</Label>
                  <Input value={form.postal_code} onChange={(e) => updateField("postal_code", e.target.value)} placeholder="00-000" />
                </div>
                <div className="space-y-2">
                  <Label>Miasto</Label>
                  <Input value={form.city} onChange={(e) => updateField("city", e.target.value)} />
                </div>
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

          <Button onClick={handleRegister} className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Zarejestruj się
          </Button>

          <div className="text-center">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Masz już konto? Zaloguj się
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
