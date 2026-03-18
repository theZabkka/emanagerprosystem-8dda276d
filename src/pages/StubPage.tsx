import { AppLayout } from "@/components/layout/AppLayout";
import { Construction } from "lucide-react";

interface StubPageProps {
  title: string;
}

export default function StubPage({ title }: StubPageProps) {
  return (
    <AppLayout title={title}>
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Construction className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="text-muted-foreground">Ta sekcja jest w trakcie budowy.</p>
      </div>
    </AppLayout>
  );
}
