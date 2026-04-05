import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Paperclip, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface BugReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BugReportModal({ open, onOpenChange }: BugReportModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(window.location.pathname);
  const [steps, setSteps] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setTitle("");
    setDescription("");
    setLocation(window.location.pathname);
    setSteps("");
    setFiles([]);
  };

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!user || !title.trim() || !description.trim()) return;
    setSubmitting(true);

    try {
      // 1. Insert bug report
      const { data: bug, error: bugError } = await supabase
        .from("bug_reports")
        .insert({
          reporter_id: user.id,
          title: title.trim(),
          description: description.trim(),
          location: location.trim() || null,
          steps_to_reproduce: steps.trim() || null,
        })
        .select("id")
        .single();

      if (bugError) throw bugError;

      // 2. Upload files & create attachment records
      for (const file of files) {
        const ext = file.name.split(".").pop();
        const filePath = `${bug.id}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("bug_attachments")
          .upload(filePath, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        await supabase.from("bug_attachments").insert({
          bug_id: bug.id,
          file_path: filePath,
          file_type: file.type,
        });
      }

      toast({ title: "Zgłoszenie zostało wysłane", description: "Dziękujemy za raport błędu." });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Błąd", description: err.message || "Nie udało się wysłać zgłoszenia.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Zgłoś błąd systemu</DialogTitle>
          <DialogDescription>Opisz problem, który napotkałeś. Nasz zespół zajmie się nim jak najszybciej.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="bug-title">Tytuł *</Label>
            <Input id="bug-title" placeholder="Krótki opis problemu" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bug-desc">Opis *</Label>
            <Textarea id="bug-desc" placeholder="Szczegółowy opis błędu..." rows={4} value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bug-location">Miejsce (URL / widok)</Label>
            <Input id="bug-location" placeholder="/dashboard" value={location} onChange={e => setLocation(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bug-steps">Kroki do odtworzenia</Label>
            <Textarea id="bug-steps" placeholder="1. Otwieram stronę...&#10;2. Klikam przycisk...&#10;3. Pojawia się błąd..." rows={3} value={steps} onChange={e => setSteps(e.target.value)} />
          </div>

          {/* File attachments */}
          <div className="space-y-2">
            <Label>Zrzuty ekranu</Label>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileAdd} />
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="h-4 w-4" /> Dodaj zrzut ekranu
            </Button>

            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-muted rounded-md px-2 py-1 text-xs">
                    <span className="truncate max-w-[120px]">{f.name}</span>
                    <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button className="w-full" disabled={submitting || !title.trim() || !description.trim()} onClick={handleSubmit}>
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Wysyłanie...</> : "Wyślij zgłoszenie"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
