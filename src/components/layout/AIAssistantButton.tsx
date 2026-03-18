import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AIAssistantButton() {
  return (
    <Button
      size="icon"
      className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 z-50"
    >
      <Bot className="h-5 w-5" />
    </Button>
  );
}
