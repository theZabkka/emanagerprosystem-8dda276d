import { AppLayout } from "@/components/layout/AppLayout";
import { AlertTriangle, Users, TrendingUp, Clock, TicketCheck, RefreshCcw, CheckCircle2, Eye, Bug, UserX } from "lucide-react";
import { AlertBanner } from "@/components/dashboard/AlertBanner";
import { StatCard } from "@/components/dashboard/StatCard";
import { TaskListCard } from "@/components/dashboard/TaskListCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { PipelineOverview } from "@/components/dashboard/PipelineOverview";
import { TeamLoadCard } from "@/components/dashboard/TeamLoadCard";
import { useDashboardData } from "@/components/dashboard/useDashboardData";
import { useRole } from "@/hooks/useRole";

export default function StaffDashboard() {
  const data = useDashboardData();
  const { currentRole } = useRole();
  const canSeeBugs = ["superadmin", "boss", "koordynator"].includes(currentRole);
  const canSeeUnassigned = ["superadmin", "boss", "koordynator", "admin"].includes(currentRole);

  return (
    <AppLayout title="Pulpit">
      <div className="space-y-6 max-w-7xl mx-auto">
        {(data.overdue > 0 || data.corrections > 0 || data.clientReview > 0 || (canSeeBugs && data.unreadBugs > 0) || (canSeeUnassigned && data.unassignedTasks > 0)) && (
        <div className="space-y-2">
          {canSeeBugs && data.unreadBugs > 0 && <AlertBanner color="red" icon={Bug} text={`Masz ${data.unreadBugs} nowe, nieodczytane zgłoszenia błędów.`} actionText="Zobacz" navigateTo="/admin/bugs" />}
          {canSeeUnassigned && data.unassignedTasks > 0 && <AlertBanner color="orange" icon={UserX} text={`Masz ${data.unassignedTasks} zadań oczekujących na przypisanie.`} actionText="Rozdziel zadania" navigateTo="/tasks" />}
          {data.overdue > 0 && <AlertBanner color="red" icon={AlertTriangle} text={`Masz ${data.overdue} zaległych zadań`} actionText="Zobacz" navigateTo="/tasks?filter=overdue" />}
          {data.corrections > 0 && <AlertBanner color="orange" icon={RefreshCcw} text={`${data.corrections} zadań w poprawkach`} actionText="Zobacz" navigateTo="/tasks?status=corrections" />}
          {data.clientReview > 0 && <AlertBanner color="orange" icon={CheckCircle2} text={`${data.clientReview} zadań oczekuje na weryfikację`} actionText="Zobacz" navigateTo="/tasks?status=client_review" />}
        </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard title="Klienci" value={data.activeClients} subtitle={`/ ${data.totalClients} ogółem`} icon={Users} navigateTo="/clients" />
          <StatCard title="Wartość lejka" value={data.pipelineValue} subtitle={data.pipelineCount} icon={TrendingUp} navigateTo="/crm" />
          <StatCard title="Zaległe" value={data.overdue} icon={Clock} navigateTo="/tasks?filter=overdue" />
          <StatCard title="Zgłoszenia" value="0" subtitle="/ 0 ogółem" icon={TicketCheck} />
          <StatCard title="W poprawkach" value={data.corrections} icon={RefreshCcw} navigateTo="/tasks?status=corrections" />
          <StatCard title="Do akceptacji" value={data.clientReview} icon={Eye} navigateTo="/tasks?status=client_review" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TaskListCard title="Czeka na akceptację klienta" tasks={data.clientReviewTasks} emptyMessage="Brak zadań oczekujących na akceptację." />
          <TaskListCard title="Zadania z problemami jakości" tasks={data.correctionTasks} emptyMessage="Brak zadań z problemami jakości." badgeLabel="Poprawki" badgeVariant="destructive" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActivityFeed activities={data.activities} />
          <PipelineOverview stages={data.pipeline} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TeamLoadCard title="Obciążenie zespołu" members={[]} emptyMessage="Brak danych o obciążeniu zespołu." variant="load" />
          <TeamLoadCard title="Jakość weryfikacji zespołu" members={[]} emptyMessage="Brak danych o jakości weryfikacji." variant="quality" />
        </div>
      </div>
    </AppLayout>
  );
}
