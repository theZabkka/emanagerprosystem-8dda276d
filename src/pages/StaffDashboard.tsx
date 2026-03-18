import { AppLayout } from "@/components/layout/AppLayout";
import { AlertTriangle, Users, TrendingUp, Clock, TicketCheck, RefreshCcw, CheckCircle2, Eye } from "lucide-react";
import { AlertBanner } from "@/components/dashboard/AlertBanner";
import { StatCard } from "@/components/dashboard/StatCard";
import { DemoBanner } from "@/components/dashboard/DemoBanner";
import { TaskListCard } from "@/components/dashboard/TaskListCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { PipelineOverview } from "@/components/dashboard/PipelineOverview";
import { TeamLoadCard } from "@/components/dashboard/TeamLoadCard";
import { useDashboardData } from "@/components/dashboard/useDashboardData";

const DEMO_TEAM_LOAD = [
  { name: "Piotr Wiśniewski", tasks: 5, hours: 28 },
  { name: "Anna Nowak", tasks: 3, hours: 18 },
  { name: "Tomasz Lewandowski", tasks: 2, hours: 15 },
  { name: "Katarzyna Zielińska", tasks: 2, hours: 10 },
];

const DEMO_TEAM_QUALITY = [
  { name: "Jan Kowalski", rate: "94%" },
  { name: "Anna Nowak", rate: "88%" },
  { name: "Katarzyna Zielińska", rate: "91%" },
];

export default function StaffDashboard() {
  const data = useDashboardData();

  return (
    <AppLayout title="Pulpit">
      <div className="space-y-6 max-w-7xl mx-auto">
        {data.isDemo && <DemoBanner />}

        <div className="space-y-2">
          <AlertBanner color="red" icon={AlertTriangle} text={`Masz ${data.overdue} zaległych zadań`} actionText="Zobacz" />
          <AlertBanner color="orange" icon={RefreshCcw} text={`${data.corrections} zadań w poprawkach`} actionText="Zobacz" />
          <AlertBanner color="orange" icon={CheckCircle2} text={`${data.clientReview} zadań oczekuje na weryfikację`} actionText="Zobacz" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard title="Klienci" value={data.activeClients} subtitle={`/ ${data.totalClients} ogółem`} icon={Users} />
          <StatCard title="Wartość lejka" value={data.pipelineValue} subtitle={data.pipelineCount} icon={TrendingUp} />
          <StatCard title="Zaległe" value={data.overdue} icon={Clock} />
          <StatCard title="Zgłoszenia" value="0" subtitle="/ 0 ogółem" icon={TicketCheck} />
          <StatCard title="W poprawkach" value={data.corrections} icon={RefreshCcw} />
          <StatCard title="Do akceptacji" value={data.clientReview} icon={Eye} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TaskListCard
            title="Czeka na akceptację klienta"
            tasks={data.clientReviewTasks}
            emptyMessage="Brak zadań oczekujących na akceptację."
          />
          <TaskListCard
            title="Zadania z problemami jakości"
            tasks={data.correctionTasks}
            emptyMessage="Brak zadań z problemami jakości."
            badgeLabel="Poprawki"
            badgeVariant="destructive"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActivityFeed activities={data.activities} />
          <PipelineOverview stages={data.pipeline} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TeamLoadCard
            title="Obciążenie zespołu"
            members={data.isDemo ? DEMO_TEAM_LOAD : []}
            emptyMessage="Brak danych o obciążeniu zespołu."
            variant="load"
          />
          <TeamLoadCard
            title="Jakość weryfikacji zespołu"
            members={data.isDemo ? DEMO_TEAM_QUALITY : []}
            emptyMessage="Brak danych o jakości weryfikacji."
            variant="quality"
          />
        </div>
      </div>
    </AppLayout>
  );
}
