import { ReactNode, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ClientSidebar } from "./ClientSidebar";
import { Topbar } from "./Topbar";
import { AIAssistantButton } from "./AIAssistantButton";
import { useRole } from "@/hooks/useRole";
import { useRoutePrefetch } from "@/hooks/useRoutePrefetch";
import { CoordinatorFreezeOverlay } from "@/components/tasks/CoordinatorFreezeOverlay";
import { ProfileGatekeeper } from "./ProfileGatekeeper";
import { VerificationSnoozeBanner } from "./VerificationSnoozeBanner";
import { useVerificationLock } from "@/hooks/useVerificationLock";
import { useLocation, useNavigate } from "react-router-dom";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const { isClient } = useRole();
  useRoutePrefetch();
  const { hasPendingVerifications, activeLockedTaskId, isSnoozed, isHardBlocked } = useVerificationLock();
  const location = useLocation();
  const navigate = useNavigate();

  const isLocked = isHardBlocked && !!activeLockedTaskId;
  const isOnLockedTask = isLocked && location.pathname === `/tasks/${activeLockedTaskId}`;

  // Block browser back button when locked
  useEffect(() => {
    if (!isLocked) return;

    const handlePopState = () => {
      window.history.pushState(null, "", `/tasks/${activeLockedTaskId}`);
      navigate(`/tasks/${activeLockedTaskId}`, { replace: true });
    };

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
      <div className="min-h-screen flex w-full flex-col">
        {/* Yellow snooze banner at the very top */}
        <VerificationSnoozeBanner />

        <div className="flex flex-1 min-h-0">
          {/* Sidebar with conditional lock */}
          <div className={isLocked && isOnLockedTask ? "pointer-events-none opacity-50 grayscale" : ""}>
            {isClient ? <ClientSidebar /> : <AppSidebar />}
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            {/* Topbar with conditional lock */}
            <div className={isLocked && isOnLockedTask ? "pointer-events-none opacity-50 grayscale" : ""}>
              <Topbar title={title} />
            </div>

            <main className="flex-1 overflow-auto p-6 bg-background">
              {children}
            </main>
          </div>
        </div>
      </div>
      <AIAssistantButton />
      <CoordinatorFreezeOverlay />
      <ProfileGatekeeper />
    </SidebarProvider>
  );
}
