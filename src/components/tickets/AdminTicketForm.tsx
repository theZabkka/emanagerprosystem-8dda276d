import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "./RichTextEditor";
import { CreateClientDialog } from "@/components/clients/CreateClientDialog";
import { toast } from "sonner";
import { Loader2, X, Paperclip, ChevronsUpDown, Plus } from "lucide-react";

const DEPARTMENTS = [
  "Zgłoszenia problemów",
  "Aktualizacje silników / wtyczek / www / problemy hostingowe",
  "Pomoc EMANAGER.PRO - zlecenia, awarie, zgłoszenia helpdesk IT",
  "Biuro EMANAGER.PRO - sprawy organizacyjne, ustalenia",
  "bohema@emanager.pro",
  "Praktyki i staże w EMANAGER.PRO",
];

const PRIORITIES = ["Niski", "Średni", "Wysoki"];

export default function AdminTicketForm() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: staffMembers } = useStaffMembers();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [priority, setPriority] = useState("Średni");
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [clientComboOpen, setClientComboOpen] = useState(false);
  const [createClientOpen, setCreateClientOpen] = useState(false);

  const { data: clients, refetch: refetchClients } = useQuery({
    queryKey: ["ticket-clients"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").order("name");
      return data || [];
    },
  });

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
    if (!clientId) { toast.error("Wybierz klienta"); return; }

    setLoading(true);
    try {
      // Step 1: INSERT ticket with priority & assigned_to
      const { data: ticket, error: ticketError } = await supabase
        .from("tickets")
        .insert({
          title,
          department,
          description,
          client_id: clientId,
          created_by: profile?.id || null,
          priority,
          assigned_to: assignedTo,
        } as any)
        .select("id")
        .single();

      if (ticketError) throw ticketError;

      // Step 2 & 3: Upload then link attachments
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
          });
        }
      }

      toast.success("Zgłoszenie utworzone pomyślnie!");
      navigate("/admin/tickets");
    } catch (err: any) {
      toast.error("Błąd: " + (err.message || "Nieznany"));
    } finally {
      setLoading(false);
    }
  }

  const selectedClient = clients?.find((c) => c.id === clientId);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Client selector */}
      <div className="space-y-2">
        <Label>Klient <span className="text-destructive">*</span></Label>
        <Popover open={clientComboOpen} onOpenChange={setClientComboOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
              {selectedClient ? selectedClient.name : "Wybierz klienta..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder="Szukaj klienta..." />
              <CommandList>
                <CommandEmpty>Nie znaleziono klienta</CommandEmpty>
                <CommandGroup>
                  {(clients || []).map((c) => (
                    <CommandItem key={c.id} value={c.name} onSelect={() => { setClientId(c.id); setClientComboOpen(false); }}>
                      {c.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
              <div className="border-t p-1">
                <Button
                  variant="ghost" size="sm"
                  className="w-full justify-start text-primary"
                  onClick={() => { setClientComboOpen(false); setCreateClientOpen(true); }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Szybko dodaj nowego klienta
                </Button>
              </div>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label>Temat <span className="text-destructive">*</span></Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Krótki opis problemu..." />
      </div>

      {/* Department */}
      <div className="space-y-2">
        <Label>Departament <span className="text-destructive">*</span></Label>
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Priority & Assigned to - side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Priorytet</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Przypisz do</Label>
          <Select value={assignedTo || "none"} onValueChange={(v) => setAssignedTo(v === "none" ? null : v)}>
            <SelectTrigger><SelectValue placeholder="Nieprzypisane" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nieprzypisane</SelectItem>
              {(staffMembers || []).map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label>Treść <span className="text-destructive">*</span></Label>
        <RichTextEditor value={description} onChange={setDescription} placeholder="Opisz problem..." />
      </div>

      {/* Attachments */}
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

      <CreateClientDialog
        open={createClientOpen}
        onOpenChange={setCreateClientOpen}
        onCreated={() => refetchClients()}
      />
    </div>
  );
}
