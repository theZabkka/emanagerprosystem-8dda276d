import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { DataSourceProvider } from "@/hooks/useDataSource";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import TaskDetail from "./pages/TaskDetail";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Pipeline from "./pages/Pipeline";
import Messenger from "./pages/Messenger";
import OKR from "./pages/OKR";
import OperationalBoard from "./pages/OperationalBoard";
import TeamBoard from "./pages/TeamBoard";
import TeamCalendar from "./pages/TeamCalendar";
import TimeReports from "./pages/TimeReports";
import MyDay from "./pages/MyDay";
import Settings from "./pages/Settings";
import Automations from "./pages/Automations";
import AutomationCenter from "./pages/AutomationCenter";
import Team from "./pages/Team";
import WhatsNew from "./pages/WhatsNew";
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
  { path: "/routines", title: "Rutyny" },
  { path: "/contracts", title: "Umowy" },
  { path: "/orders", title: "Zlecenia" },
  { path: "/client-ideas", title: "Pomysły klientów" },
  { path: "/conversations", title: "Rozmowy" },
  { path: "/micro-interventions", title: "Mikro-interwencje" },
  { path: "/client-inbox", title: "Skrzynka klientów" },
  { path: "/tickets", title: "Zgłoszenia" },
  { path: "/meetings", title: "Spotkania" },
  { path: "/absences", title: "Nieobecności" },
  { path: "/equipment", title: "Sprzęt" },
  { path: "/analytics", title: "Analityki" },
  { path: "/retention", title: "Retencja" },
  { path: "/reports", title: "Raporty" },
  { path: "/team-results", title: "Wyniki zespołu" },
  { path: "/team-notes", title: "Notatki zespołu" },
  { path: "/team-analytics", title: "Analityka zespołu" },
  { path: "/recurring-tasks", title: "Zadania cykliczne" },
  { path: "/suggestions", title: "Sugestie" },
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
          <DataSourceProvider>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/my-day" element={<ProtectedRoute><MyDay /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
            <Route path="/tasks/:id" element={<ProtectedRoute><TaskDetail /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
            <Route path="/clients/:id" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
            <Route path="/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
            <Route path="/messenger" element={<ProtectedRoute><Messenger /></ProtectedRoute>} />
            <Route path="/okr" element={<ProtectedRoute><OKR /></ProtectedRoute>} />
            <Route path="/operational" element={<ProtectedRoute><OperationalBoard /></ProtectedRoute>} />
            <Route path="/team-board" element={<ProtectedRoute><TeamBoard /></ProtectedRoute>} />
            <Route path="/team/calendar" element={<ProtectedRoute><TeamCalendar /></ProtectedRoute>} />
            <Route path="/reports/time" element={<ProtectedRoute><TimeReports /></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/automations" element={<ProtectedRoute><Automations /></ProtectedRoute>} />
            <Route path="/automation-center" element={<ProtectedRoute><AutomationCenter /></ProtectedRoute>} />
            <Route path="/whats-new" element={<ProtectedRoute><WhatsNew /></ProtectedRoute>} />
            {stubRoutes.map((r) => (
              <Route key={r.path} path={r.path} element={<ProtectedRoute><StubPage title={r.title} /></ProtectedRoute>} />
            ))}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </DataSourceProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
