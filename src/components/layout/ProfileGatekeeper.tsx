import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function ProfileGatekeeper() {
  const { profile } = useAuth();
  const { isClient, clientId } = useRole();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const [name, setName] = useState("");
  const [nip, setNip] = useState("");
  const [phone, setPhone] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  // Fetch client record to decide if modal should show
  useEffect(() => {
    if (!isClient || !clientId) {
      setOpen(false);
      return;
    }

    // Skip gatekeeper entirely for users created as contacts (via create-contact-user)
    if (profile?.is_contact) {
      setChecked(true);
      setOpen(false);
      return;
    }

    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("clients")
        .select("is_auto_created, nip, contact_person, phone")
        .eq("id", clientId)
        .single();

      if (cancelled || !data) return;

      const needsCompletion =
        data.is_auto_created === true ||
        !data.nip && !data.contact_person ||
        !data.phone;

      if (needsCompletion) {
        setName(data.contact_person || "");
        setPhone(data.phone || "");
        setNip(data.nip || "");
        setOpen(true);
      }
      setChecked(true);
    })();

    return () => { cancelled = true; };
  }, [isClient, clientId, profile?.is_contact]);

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("Wypełnij wszystkie wymagane pola.");
      return;
    }
    if (!isPrivate && !nip.trim()) {
      toast.error("Pole NIP jest wymagane dla firm.");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("clients")
      .update({
        contact_person: name.trim(),
        phone: phone.trim(),
        nip: isPrivate ? null : nip.trim(),
        is_auto_created: false,
      })
      .eq("id", clientId!);

    setLoading(false);

    if (error) {
      toast.error("Błąd zapisu: " + error.message);
      return;
    }

    toast.success("Dane zapisane pomyślnie!");
    setOpen(false);
  };

  if (!isClient || !checked || !open) return null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Uzupełnij dane profilu</DialogTitle>
          <DialogDescription>
            Witaj! Zanim przejdziesz do swoich zgłoszeń, uzupełnij dane kontaktowe profilu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="gk-name">Imię i Nazwisko / Nazwa Firmy *</Label>
            <Input
              id="gk-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Jan Kowalski"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="gk-private"
              checked={isPrivate}
              onCheckedChange={(v) => setIsPrivate(v === true)}
            />
            <Label htmlFor="gk-private" className="cursor-pointer text-sm">
              Jestem osobą prywatną (nie posiadam NIP)
            </Label>
          </div>

          {!isPrivate && (
            <div className="space-y-2">
              <Label htmlFor="gk-nip">NIP *</Label>
              <Input
                id="gk-nip"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="np. 1234567890"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="gk-phone">Telefon *</Label>
            <Input
              id="gk-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="np. +48 123 456 789"
            />
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? "Zapisywanie..." : "Zapisz i kontynuuj"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
