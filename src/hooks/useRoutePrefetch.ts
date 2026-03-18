import { useEffect } from "react";

// Prefetch all main route chunks after initial render
const routeImports = [
  () => import("@/pages/Tasks"),
  () => import("@/pages/Clients"),
  () => import("@/pages/Projects"),
  () => import("@/pages/Pipeline"),
  () => import("@/pages/Messenger"),
  () => import("@/pages/MyDay"),
  () => import("@/pages/OKR"),
  () => import("@/pages/OperationalBoard"),
  () => import("@/pages/TeamBoard"),
  () => import("@/pages/Team"),
  () => import("@/pages/Settings"),
  () => import("@/pages/ClientDetail"),
  () => import("@/pages/ProjectDetail"),
  () => import("@/pages/TaskDetail"),
  () => import("@/pages/TeamCalendar"),
  () => import("@/pages/TimeReports"),
  () => import("@/pages/Automations"),
  () => import("@/pages/AutomationCenter"),
  () => import("@/pages/WhatsNew"),
];

export function useRoutePrefetch() {
  useEffect(() => {
    // Wait for the current page to fully render and become idle
    const timer = setTimeout(() => {
      if ("requestIdleCallback" in window) {
        (window as any).requestIdleCallback(() => prefetchAll(), { timeout: 5000 });
      } else {
        prefetchAll();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);
}

function prefetchAll() {
  // Stagger imports to avoid network congestion
  routeImports.forEach((importFn, i) => {
    setTimeout(() => {
      importFn().catch(() => {
        // Silently ignore prefetch failures
      });
    }, i * 100);
  });
}
