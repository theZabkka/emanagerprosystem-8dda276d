import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ClientSidebar } from "./ClientSidebar";
import { Topbar } from "./Topbar";
import { AIAssistantButton } from "./AIAssistantButton";
import { ZadarmaWidget } from "./ZadarmaWidget";
import { useRole } from "@/hooks/useRole";
import { useRoutePrefetch } from "@/hooks/useRoutePrefetch";
import { CoordinatorFreezeOverlay } from "@/components/tasks/CoordinatorFreezeOverlay";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const { isClient } = useRole();
  useRoutePrefetch();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {isClient ? <ClientSidebar /> : <AppSidebar />}
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar title={title} />
          <main className="flex-1 overflow-auto p-6 bg-background">
            {children}
          </main>
        </div>
      </div>
      <AIAssistantButton />
      {!isClient && <ZadarmaWidget />}
      <CoordinatorFreezeOverlay />
    </SidebarProvider>
  );
}
