import { ReactNode, useEffect, useState, useCallback } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ClientSidebar } from "./ClientSidebar";
import { Topbar } from "./Topbar";
import { AIAssistantButton } from "./AIAssistantButton";
import { useRole } from "@/hooks/useRole";
import { useRoutePrefetch } from "@/hooks/useRoutePrefetch";
import { CoordinatorFreezeOverlay } from "@/components/tasks/CoordinatorFreezeOverlay";
import { ProfileGatekeeper } from "./ProfileGatekeeper";
import { useVerificationLock } from "@/hooks/useVerificationLock";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

function SnoozeBanner() {
  const { snoozedUntil, clearSnooze, hasPendingVerifications } = useVerificationLock();
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!snoozedUntil) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((snoozedUntil - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [snoozedUntil]);

  if (!snoozedUntil || !hasPendingVerifications) return null;
  if (secondsLeft <= 0) return null;

  return (
    <div className="bg-yellow-500 text-yellow-950 px-4 py-2 flex items-center justify-between gap-3 text-sm font-medium z-[60] relative">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span>
          Masz zaległe zadania do weryfikacji. Wymuszenie za{" "}
          <strong className="tabular-nums">
            {Math.floor(secondsLeft / 60).toString().padStart(2, "0")}:{(secondsLeft % 60).toString().padStart(2, "0")}
          </strong>.
        </span>
      </div>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => clearSnooze()}
        className="bg-yellow-900 text-yellow-100 hover:bg-yellow-800 border-0 h-7 text-xs font-semibold flex-shrink-0"
      >
        <Clock className="h-3.5 w-3.5 mr-1" />
        Weryfikuj teraz
      </Button>
    </div>
  );
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const { isClient } = useRole();
  useRoutePrefetch();
  const { hasPendingVerifications, activeLockedTaskId, isSnoozed } = useVerificationLock();
  const location = useLocation();
  const navigate = useNavigate();

  const isLocked = hasPendingVerifications && !!activeLockedTaskId && !isSnoozed;
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

  // CSS classes for navigation lock ("Kaftan Bezpieczeństwa")
  const navLockClasses = isLocked && isOnLockedTask
    ? "pointer-events-none opacity-50 grayscale select-none"
    : "";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full">
        {/* Yellow snooze banner at very top */}
        <SnoozeBanner />

        <div className="flex flex-1 min-h-0">
          {/* Sidebar with selective lock */}
          <div className={navLockClasses}>
            {isClient ? <ClientSidebar /> : <AppSidebar />}
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            {/* Topbar with selective lock */}
            <div className={navLockClasses}>
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
