import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "./RichTextEditor";
import { toast } from "sonner";
import { Loader2, X, Paperclip } from "lucide-react";

const DEPARTMENTS = [
  "Zgłoszenia problemów",
  "Aktualizacje silników / wtyczek / www / problemy hostingowe",
  "Pomoc EMANAGER.PRO - zlecenia, awarie, zgłoszenia helpdesk IT",
  "Biuro EMANAGER.PRO - sprawy organizacyjne, ustalenia",
  "bohema@emanager.pro",
  "Praktyki i staże w EMANAGER.PRO",
];

export default function ClientTicketForm() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected]);
    e.target.value = "";
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  async function handleSubmit() {
    if (!title.trim()) { toast.error("Podaj temat zgłoszenia"); return; }
    if (!description.trim() || description === "<p></p>") { toast.error("Podaj treść zgłoszenia"); return; }

    const clientId = profile?.client_id;
    if (!clientId) { toast.error("Brak powiązanego klienta"); return; }

    setLoading(true);
    try {
      // Step 1: INSERT ticket
      const { data: ticket, error: ticketError } = await supabase
        .from("tickets")
        .insert({
          title,
          department,
          description,
          client_id: clientId,
          created_by: profile?.id || null,
          contact_id: profile?.id || null,
          priority: "Średni",
        } as any)
        .select("id")
        .single();

      if (ticketError) throw ticketError;

      // Step 2 & 3: Upload attachments then link
      if (files.length > 0 && ticket) {
        for (const file of files) {
          const path = `${ticket.id}/${Date.now()}_${file.name}`;
          const { error: uploadErr } = await supabase.storage
            .from("ticket_attachments")
            .upload(path, file);

          if (uploadErr) { console.error("Upload error:", uploadErr); continue; }

          const { data: urlData } = supabase.storage
            .from("ticket_attachments")
            .getPublicUrl(path);

          await supabase.from("ticket_attachments").insert({
            ticket_id: ticket.id,
            file_url: urlData.publicUrl,
            file_name: file.name,
          } as any);
        }
      }

      toast.success("Zgłoszenie utworzone pomyślnie!");
      navigate("/client/tickets");
    } catch (err: any) {
      toast.error("Błąd: " + (err.message || "Nieznany"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <Label>Temat <span className="text-destructive">*</span></Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Krótki opis problemu..." />
      </div>

      <div className="space-y-2">
        <Label>Departament <span className="text-destructive">*</span></Label>
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {DEPARTMENTS.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Treść <span className="text-destructive">*</span></Label>
        <RichTextEditor value={description} onChange={setDescription} placeholder="Opisz problem..." />
      </div>

      <div className="space-y-2">
        <Label>Załączniki</Label>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
          <Paperclip className="h-4 w-4" /> Dodaj pliki
        </Button>
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {files.map((f, i) => (
              <Badge key={i} variant="secondary" className="gap-1 pr-1">
                {f.name}
                <button onClick={() => removeFile(i)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Button onClick={handleSubmit} disabled={loading} className="w-full">
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Utwórz zgłoszenie
      </Button>
    </div>
  );
}
