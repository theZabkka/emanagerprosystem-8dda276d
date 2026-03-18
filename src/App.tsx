import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import StubPage from "./pages/StubPage";
import NotFound from "./pages/NotFound";
import { ReactNode } from "react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-muted-foreground">Ładowanie...</div>;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-muted-foreground">Ładowanie...</div>;
  if (session) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const stubRoutes = [
  { path: "/my-day", title: "Mój dzień" },
  { path: "/okr", title: "Cele i OKR" },
  { path: "/tasks", title: "Zadania" },
  { path: "/projects", title: "Projekty" },
  { path: "/operational", title: "Tablica operacyjna" },
  { path: "/team-board", title: "Tablica zespołu" },
  { path: "/routines", title: "Rutyny" },
  { path: "/clients", title: "Klienci" },
  { path: "/contracts", title: "Umowy" },
  { path: "/orders", title: "Zlecenia" },
  { path: "/pipeline", title: "Lejek sprzedaży" },
  { path: "/client-ideas", title: "Pomysły klientów" },
  { path: "/conversations", title: "Rozmowy" },
  { path: "/micro-interventions", title: "Mikro-interwencje" },
  { path: "/messenger", title: "Komunikator" },
  { path: "/client-inbox", title: "Skrzynka klientów" },
  { path: "/tickets", title: "Zgłoszenia" },
  { path: "/team", title: "Zespół" },
  { path: "/meetings", title: "Spotkania" },
  { path: "/team/calendar", title: "Kalendarz" },
  { path: "/absences", title: "Nieobecności" },
  { path: "/equipment", title: "Sprzęt" },
  { path: "/analytics", title: "Analityki" },
  { path: "/retention", title: "Retencja" },
  { path: "/reports", title: "Raporty" },
  { path: "/reports/time", title: "Raporty czasu" },
  { path: "/team-results", title: "Wyniki zespołu" },
  { path: "/team-notes", title: "Notatki zespołu" },
  { path: "/automations", title: "Automatyzacje" },
  { path: "/automation-center", title: "Centrum automatyzacji" },
  { path: "/team-analytics", title: "Analityka zespołu" },
  { path: "/recurring-tasks", title: "Zadania cykliczne" },
  { path: "/suggestions", title: "Sugestie" },
  { path: "/whats-new", title: "Co nowego" },
  { path: "/settings", title: "Ustawienia" },
  { path: "/docs", title: "Dokumentacja" },
  { path: "/project-guide", title: "Instrukcja projektu" },
];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            {stubRoutes.map((r) => (
              <Route key={r.path} path={r.path} element={<ProtectedRoute><StubPage title={r.title} /></ProtectedRoute>} />
            ))}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
