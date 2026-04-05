import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sun, LayoutDashboard, Target } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { MyDayTab } from "@/components/dashboard/MyDayTab";
import { OverviewTab } from "@/components/dashboard/OverviewTab";
import { OkrTab } from "@/components/dashboard/OkrTab";

export default function StaffDashboard() {
  const { currentRole } = useRole();
  const canSeeOkr = ["superadmin", "boss", "koordynator"].includes(currentRole);

  return (
    <AppLayout title="Pulpit">
      <Tabs defaultValue="my-day" className="space-y-6">
        <TabsList>
          <TabsTrigger value="my-day" className="gap-1.5">
            <Sun className="h-4 w-4" />
            Mój dzień
          </TabsTrigger>
          <TabsTrigger value="overview" className="gap-1.5">
            <LayoutDashboard className="h-4 w-4" />
            Przegląd
          </TabsTrigger>
          {canSeeOkr && (
            <TabsTrigger value="okr" className="gap-1.5">
              <Target className="h-4 w-4" />
              Cele OKR
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my-day">
          <MyDayTab />
        </TabsContent>
        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>
        {canSeeOkr && (
          <TabsContent value="okr">
            <OkrTab />
          </TabsContent>
        )}
      </Tabs>
    </AppLayout>
  );
}
