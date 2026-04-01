import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DescriptionCardProps {
  description: string | null;
  taskId: string;
  canEdit: boolean;
  onSaved: () => void;
}

export function DescriptionCard({ description, taskId, canEdit, onSaved }: DescriptionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraft(description || "");
    setIsEditing(true);
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("tasks")
      .update({ description: draft || null })
      .eq("id", taskId);
    setSaving(false);
    if (error) {
      toast.error("Nie udało się zapisać opisu");
      return;
    }
    setIsEditing(false);
    onSaved();
    toast.success("Opis zaktualizowany");
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Opis</CardTitle>
          {canEdit && !isEditing && (
            <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-7" onClick={startEdit}>
              <Edit3 className="h-3 w-3" />
              Edytuj
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={8}
              placeholder="Wpisz opis zadania (Markdown obsługiwany)..."
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" className="text-xs" onClick={save} disabled={saving}>
                {saving ? "Zapisywanie..." : "Zapisz"}
              </Button>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setIsEditing(false)} disabled={saving}>
                Anuluj
              </Button>
            </div>
          </div>
        ) : description ? (
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-muted-foreground [&_a]:text-primary [&_a]:underline [&_a]:break-all">
            <ReactMarkdown
              components={{
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
              }}
            >
              {description}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Brak opisu</p>
        )}
      </CardContent>
    </Card>
  );
}
