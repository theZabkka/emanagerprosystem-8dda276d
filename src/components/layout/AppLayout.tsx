import { ReactNode, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ClientSidebar } from "./ClientSidebar";
import { Topbar } from "./Topbar";
import { AIAssistantButton } from "./AIAssistantButton";
import { useRole } from "@/hooks/useRole";
import { useRoutePrefetch } from "@/hooks/useRoutePrefetch";
import { CoordinatorFreezeOverlay } from "@/components/tasks/CoordinatorFreezeOverlay";
import { VerificationBanner } from "./VerificationBanner";
import { ProfileGatekeeper } from "./ProfileGatekeeper";
import { useVerificationLock } from "@/hooks/useVerificationLock";
import { useLocation, useNavigate } from "react-router-dom";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const { isClient } = useRole();
  useRoutePrefetch();
  const { hasPendingVerifications, activeLockedTaskId } = useVerificationLock();
  const location = useLocation();
  const navigate = useNavigate();

  const isLocked = hasPendingVerifications && !!activeLockedTaskId;
  const isOnLockedTask = isLocked && location.pathname === `/tasks/${activeLockedTaskId}`;

  // Block browser back button when locked
  useEffect(() => {
    if (!isLocked) return;

    const handlePopState = (e: PopStateEvent) => {
      // Push the locked task URL back
      window.history.pushState(null, "", `/tasks/${activeLockedTaskId}`);
      navigate(`/tasks/${activeLockedTaskId}`, { replace: true });
    };

    // Push an extra entry so back goes to our handler
    window.history.pushState(null, "", location.pathname);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isLocked, activeLockedTaskId, navigate, location.pathname]);

  // If locked and user somehow lands on wrong page, redirect
  useEffect(() => {
    if (isLocked && !isOnLockedTask) {
      navigate(`/tasks/${activeLockedTaskId}`, { replace: true });
    }
  }, [isLocked, isOnLockedTask, activeLockedTaskId, navigate]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Navigation lock overlay */}
        {isLocked && isOnLockedTask && (
          <div
            className="fixed inset-0 z-40 pointer-events-none"
            aria-hidden="true"
          >
            {/* Block sidebar */}
            <div className="absolute left-0 top-0 bottom-0 w-[var(--sidebar-width,16rem)] pointer-events-auto bg-background/60 backdrop-blur-[1px]" />
            {/* Block topbar */}
            <div className="absolute top-0 left-[var(--sidebar-width,16rem)] right-0 h-14 pointer-events-auto bg-background/60 backdrop-blur-[1px]" />
          </div>
        )}

        {isClient ? <ClientSidebar /> : <AppSidebar />}
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar title={title} />
          <VerificationBanner />
          <main className="flex-1 overflow-auto p-6 bg-background">
            {children}
          </main>
        </div>
      </div>
      <AIAssistantButton />
      <CoordinatorFreezeOverlay />
      <ProfileGatekeeper />
    </SidebarProvider>
  );
}
