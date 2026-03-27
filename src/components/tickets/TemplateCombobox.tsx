import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { FileText } from "lucide-react";

interface TemplateComboboxProps {
  onSelect: (content: string) => void;
}

export default function TemplateCombobox({ onSelect }: TemplateComboboxProps) {
  const [open, setOpen] = useState(false);

  const { data: templates } = useQuery({
    queryKey: ["response-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("response_templates" as any)
        .select("id, title, content")
        .order("title", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as { id: string; title: string; content: string }[];
    },
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          Użyj szablonu odpowiedzi...
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Szukaj szablonu..." />
          <CommandList>
            <CommandEmpty>Brak szablonów.</CommandEmpty>
            <CommandGroup>
              {(templates || []).map((t) => (
                <CommandItem
                  key={t.id}
                  value={t.title}
                  onSelect={() => {
                    onSelect(t.content);
                    setOpen(false);
                  }}
                >
                  <FileText className="h-4 w-4 mr-2 shrink-0 text-muted-foreground" />
                  <span className="truncate">{t.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
