import { lazy, Suspense, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { RoleProvider, useRole } from "@/hooks/useRole";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { PageLoader } from "@/components/layout/PageLoader";
import { AdminRoute } from "@/components/layout/AdminRoute";

// Lazy-loaded pages
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Tasks = lazy(() => import("./pages/Tasks"));
const TaskDetail = lazy(() => import("./pages/TaskDetail"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const Pipeline = lazy(() => import("./pages/Pipeline"));
const CrmBoard = lazy(() => import("./pages/CrmBoard"));
const Messenger = lazy(() => import("./pages/Messenger"));
const OKR = lazy(() => import("./pages/OKR"));
const OperationalBoard = lazy(() => import("./pages/OperationalBoard"));
// TeamBoard merged into Tasks page as "team" kanban mode
const TeamCalendar = lazy(() => import("./pages/TeamCalendar"));
const TimeReports = lazy(() => import("./pages/TimeReports"));
const MyDay = lazy(() => import("./pages/MyDay"));
const Settings = lazy(() => import("./pages/Settings"));
const Automations = lazy(() => import("./pages/Automations"));
const AutomationCenter = lazy(() => import("./pages/AutomationCenter"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Team = lazy(() => import("./pages/Team"));
const WhatsNew = lazy(() => import("./pages/WhatsNew"));
const StubPage = lazy(() => import("./pages/StubPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Documentation = lazy(() => import("./pages/Documentation"));
const Permissions = lazy(() => import("./pages/Permissions"));
const ClientIdeas = lazy(() => import("./pages/ClientIdeas"));
const StaffIdeas = lazy(() => import("./pages/StaffIdeas"));
const TaskArchive = lazy(() => import("./pages/TaskArchive"));
const AdminNewTicket = lazy(() => import("./pages/AdminNewTicket"));
const ClientNewTicket = lazy(() => import("./pages/ClientNewTicket"));
const AdminTickets = lazy(() => import("./pages/AdminTickets"));
const ClientTickets = lazy(() => import("./pages/ClientTickets"));
const ClientTasks = lazy(() => import("./pages/ClientTasks"));
const AdminTicketDetails = lazy(() => import("./pages/AdminTicketDetails"));
const ClientTicketDetails = lazy(() => import("./pages/ClientTicketDetails"));
const AdminBugs = lazy(() => import("./pages/AdminBugs"));
const ResponseTemplates = lazy(() => import("./pages/ResponseTemplates"));
const VaultPage = lazy(() => import("./pages/VaultPage"));
const UpdatePassword = lazy(() => import("./pages/UpdatePassword"));
const Transcriptions = lazy(() => import("./pages/Transcriptions"));
const ClientReport = lazy(() => import("./pages/ClientReport"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 3 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const { roleLoading } = useRole();
  if (loading || roleLoading) return <PageLoader />;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (session) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const stubRoutes = [
  { path: "/routines", title: "Rutyny" },
  { path: "/contracts", title: "Umowy" },
  { path: "/orders", title: "Zlecenia" },

  { path: "/micro-interventions", title: "Mikro-interwencje" },
  { path: "/client-inbox", title: "Skrzynka klientów" },
  // tickets now has real pages
  { path: "/meetings", title: "Spotkania" },
  { path: "/absences", title: "Nieobecności" },
  { path: "/equipment", title: "Sprzęt" },
  { path: "/retention", title: "Retencja" },
  { path: "/reports", title: "Raporty" },
  { path: "/team-results", title: "Wyniki zespołu" },
  { path: "/team-notes", title: "Notatki zespołu" },
  { path: "/team-analytics", title: "Analityka zespołu" },
  { path: "/recurring-tasks", title: "Zadania cykliczne" },
  { path: "/suggestions", title: "Sugestie" },

  { path: "/project-guide", title: "Instrukcja projektu" },
];

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="emanager-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <RoleProvider>
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route
                      path="/login"
                      element={
                        <PublicRoute>
                          <Login />
                        </PublicRoute>
                      }
                    />
                    <Route
                      path="/register"
                      element={
                        <PublicRoute>
                          <Register />
                        </PublicRoute>
                      }
                    />
                    <Route path="/update-password" element={<UpdatePassword />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/my-day"
                      element={
                        <ProtectedRoute>
                          <MyDay />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/tasks"
                      element={
                        <ProtectedRoute>
                          <Tasks />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/tasks/archive"
                      element={
                        <ProtectedRoute>
                          <TaskArchive />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/tasks/:id"
                      element={
                        <ProtectedRoute>
                          <TaskDetail />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/clients"
                      element={
                        <ProtectedRoute>
                          <Clients />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/clients/:id"
                      element={
                        <ProtectedRoute>
                          <ClientDetail />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/projects"
                      element={
                        <ProtectedRoute>
                          <Projects />
                        </ProtectedRoute>
                      }
                    />
                    {/* /projects/archive removed — now a tab inside /projects */}
                    <Route
                      path="/projects/:id"
                      element={
                        <ProtectedRoute>
                          <ProjectDetail />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pipeline"
                      element={
                        <ProtectedRoute>
                          <Pipeline />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/crm"
                      element={
                        <ProtectedRoute>
                          <CrmBoard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/messenger"
                      element={
                        <ProtectedRoute>
                          <Messenger />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/okr"
                      element={
                        <ProtectedRoute>
                          <OKR />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/operational"
                      element={
                        <ProtectedRoute>
                          <OperationalBoard />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/team-board" element={<Navigate to="/tasks" replace />} />
                    <Route
                      path="/team/calendar"
                      element={
                        <ProtectedRoute>
                          <TeamCalendar />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/reports/time"
                      element={
                        <ProtectedRoute>
                          <TimeReports />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/team"
                      element={
                        <ProtectedRoute>
                          <Team />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <ProtectedRoute>
                          <Settings />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/automations"
                      element={
                        <ProtectedRoute>
                          <Automations />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/automation-center"
                      element={
                        <ProtectedRoute>
                          <AutomationCenter />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/analytics"
                      element={
                        <ProtectedRoute>
                          <Analytics />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/whats-new"
                      element={
                        <ProtectedRoute>
                          <WhatsNew />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings/permissions"
                      element={
                        <AdminRoute>
                          <Permissions />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/client-ideas"
                      element={
                        <ProtectedRoute>
                          <ClientIdeas />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/staff-ideas"
                      element={
                        <ProtectedRoute>
                          <StaffIdeas />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/docs"
                      element={
                        <ProtectedRoute>
                          <Documentation />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/tickets"
                      element={
                        <ProtectedRoute>
                          <AdminTickets />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/tickets/new"
                      element={
                        <ProtectedRoute>
                          <AdminNewTicket />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/tickets/:id"
                      element={
                        <ProtectedRoute>
                          <AdminTicketDetails />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/client/tasks"
                      element={
                        <ProtectedRoute>
                          <ClientTasks />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/client/tickets"
                      element={
                        <ProtectedRoute>
                          <ClientTickets />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/client/tickets/new"
                      element={
                        <ProtectedRoute>
                          <ClientNewTicket />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/client/tickets/:id"
                      element={
                        <ProtectedRoute>
                          <ClientTicketDetails />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/bugs"
                      element={
                        <ProtectedRoute>
                          <AdminBugs />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/templates"
                      element={
                        <AdminRoute>
                          <ResponseTemplates />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/vault"
                      element={
                        <ProtectedRoute>
                          <VaultPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/transcriptions"
                      element={
                        <ProtectedRoute>
                          <Transcriptions />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/client-report"
                      element={
                        <ProtectedRoute>
                          <ClientReport />
                        </ProtectedRoute>
                      }
                    />
                    {stubRoutes.map((r) => (
                      <Route
                        key={r.path}
                        path={r.path}
                        element={
                          <ProtectedRoute>
                            <StubPage title={r.title} />
                          </ProtectedRoute>
                        }
                      />
                    ))}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </RoleProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
