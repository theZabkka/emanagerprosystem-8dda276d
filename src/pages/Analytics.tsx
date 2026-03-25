import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Users, Briefcase, TrendingUp, Headphones, ListChecks, ShieldCheck } from "lucide-react";
import { AnalyticsFilters } from "@/components/analytics/AnalyticsFilters";
import { AnalyticsTasksTab } from "@/components/analytics/AnalyticsTasksTab";
import { AnalyticsQualityTab } from "@/components/analytics/AnalyticsQualityTab";
import { AnalyticsPlaceholderTab } from "@/components/analytics/AnalyticsPlaceholderTab";

const TABS = [
  { value: "tasks", label: "Zadania", icon: ListChecks },
  { value: "quality", label: "Jakość", icon: ShieldCheck },
  { value: "team", label: "Zespół", icon: Users },
  { value: "clients", label: "Klienci", icon: Briefcase },
  { value: "pipeline", label: "Pipeline", icon: TrendingUp },
  { value: "support", label: "Support", icon: Headphones },
] as const;

export default function Analytics() {
  const [days, setDays] = useState("30");
  const [projectId, setProjectId] = useState<string>("all");
  const [userId, setUserId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("tasks");

  const fromDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(days));
    return d.toISOString();
  }, [days]);

  const { data: projects } = useQuery({
    queryKey: ["analytics-projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name").eq("is_archived", false).order("name");
      return data || [];
    },
  });

  const rpcProjectId = projectId === "all" ? null : projectId;
  const rpcUserId = userId === "all" ? null : userId;

  return (
    <AppLayout title="Analizy">
      <div className="space-y-6 mx-auto max-w-7xl">
        {/* Global filters above tabs */}
        <AnalyticsFilters
          days={days} setDays={setDays}
          projectId={projectId} setProjectId={setProjectId}
          userId={userId} setUserId={setUserId}
          projects={projects || []}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="inline-flex h-11 items-center gap-1 rounded-lg bg-muted p-1">
            {TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="tasks" className="mt-4">
            <AnalyticsTasksTab fromDate={fromDate} projectId={rpcProjectId} userId={rpcUserId} />
          </TabsContent>

          <TabsContent value="quality" className="mt-4">
            {activeTab === "quality" && (
              <AnalyticsQualityTab fromDate={fromDate} projectId={rpcProjectId} userId={rpcUserId} />
            )}
          </TabsContent>

          <TabsContent value="team" className="mt-4">
            {activeTab === "team" && <AnalyticsPlaceholderTab icon={Users} label="Zespół" />}
          </TabsContent>

          <TabsContent value="clients" className="mt-4">
            {activeTab === "clients" && <AnalyticsPlaceholderTab icon={Briefcase} label="Klienci" />}
          </TabsContent>

          <TabsContent value="pipeline" className="mt-4">
            {activeTab === "pipeline" && <AnalyticsPlaceholderTab icon={TrendingUp} label="Pipeline" />}
          </TabsContent>

          <TabsContent value="support" className="mt-4">
            {activeTab === "support" && <AnalyticsPlaceholderTab icon={Headphones} label="Support" />}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
