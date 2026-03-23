import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";

interface StaffMember {
  id: string;
  full_name: string | null;
  zadarma_sip_login: string | null;
}

export function SipLoginManager() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, zadarma_sip_login")
        .neq("role", "klient")
        .order("full_name");
      if (data) setStaff(data as StaffMember[]);
    }
    fetch();
  }, []);

  const handleSave = async () => {
    const entries = Object.entries(edits);
    if (entries.length === 0) return;

    setSaving(true);
    try {
      for (const [userId, sipLogin] of entries) {
        const { error } = await supabase
          .from("profiles")
          .update({ zadarma_sip_login: sipLogin || null } as any)
          .eq("id", userId);
        if (error) throw error;
      }
      toast.success(`Zapisano numery SIP (${entries.length})`);
      setEdits({});
      // Refresh
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, zadarma_sip_login")
        .neq("role", "klient")
        .order("full_name");
      if (data) setStaff(data as StaffMember[]);
    } catch (e: any) {
      toast.error("Błąd zapisu: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 py-2">
      <p className="text-xs text-muted-foreground">
        Przypisz pracownikom numery wewnętrzne SIP z centrali Zadarma PBX (np.
        "100", "101"). Pracownik z przypisanym numerem zobaczy widget telefonu
        WebRTC.
      </p>
      <div className="space-y-2">
        {staff.map((member) => {
          const currentValue =
            edits[member.id] !== undefined
              ? edits[member.id]
              : member.zadarma_sip_login || "";
          return (
            <div
              key={member.id}
              className="flex items-center gap-3 py-1.5 border-b border-border last:border-0"
            >
              <span className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">
                {member.full_name || "—"}
              </span>
              <Input
                className="w-28 text-center"
                placeholder="np. 100"
                value={currentValue}
                onChange={(e) =>
                  setEdits((prev) => ({
                    ...prev,
                    [member.id]: e.target.value,
                  }))
                }
              />
            </div>
          );
        })}
      </div>
      {Object.keys(edits).length > 0 && (
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-1.5" />
          )}
          Zapisz numery SIP
        </Button>
      )}
    </div>
  );
}
