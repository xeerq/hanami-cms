import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Import existing components
import { UnifiedTeamDisplay } from "@/components/admin/UnifiedTeamDisplay";
import { TeamMembersManager } from "@/components/admin/TeamMembersManager";
import BlockedSlotsManager from "@/components/admin/BlockedSlotsManager";
import { UnifiedScheduleManager } from "@/components/admin/UnifiedScheduleManager";
import { EnhancedCalendarManager } from "@/components/admin/EnhancedCalendarManager";

interface TeamStats {
  totalTherapists: number;
  activeTherapists: number;
  totalTeamMembers: number;
  activeTeamMembers: number;
  pendingSchedules: number;
  blockedSlots: number;
}

export function UnifiedTeamManager() {
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [stats, setStats] = useState<TeamStats>({
    totalTherapists: 0,
    activeTherapists: 0,
    totalTeamMembers: 0,
    activeTeamMembers: 0,
    pendingSchedules: 0,
    blockedSlots: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      loadStats();
    }
  }, [isAdmin, adminLoading]);

  const loadStats = async () => {
    try {
      setLoading(true);

      // Get therapists stats
      const { data: therapists, error: therapistsError } = await supabase
        .from("therapists")
        .select("id, is_active");

      if (therapistsError) throw therapistsError;

      // Get team members stats
      const { data: teamMembers, error: teamError } = await supabase
        .from("team_members")
        .select("id, is_active");

      if (teamError) throw teamError;

      // Get pending schedules
      const { data: schedules, error: schedulesError } = await supabase
        .from("therapist_schedules")
        .select("id")
        .eq("status", "pending");

      if (schedulesError) throw schedulesError;

      // Get blocked slots
      const { data: blockedSlots, error: blockedError } = await supabase
        .from("blocked_slots")
        .select("id");

      if (blockedError) throw blockedError;

      setStats({
        totalTherapists: therapists?.length || 0,
        activeTherapists: therapists?.filter(t => t.is_active)?.length || 0,
        totalTeamMembers: teamMembers?.length || 0,
        activeTeamMembers: teamMembers?.filter(t => t.is_active)?.length || 0,
        pendingSchedules: schedules?.length || 0,
        blockedSlots: blockedSlots?.length || 0,
      });
    } catch (error: any) {
      console.error("Error loading team stats:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować statystyk zespołu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (adminLoading || !isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Terapeuci</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeTherapists}</div>
            <p className="text-xs text-muted-foreground">
              z {stats.totalTherapists} łącznie
            </p>
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                Aktywni
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Zespół</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeTeamMembers}</div>
            <p className="text-xs text-muted-foreground">
              z {stats.totalTeamMembers} łącznie
            </p>
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                Aktywni
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Oczekujące</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingSchedules}</div>
            <p className="text-xs text-muted-foreground">
              grafiki do zatwierdzenia
            </p>
            <div className="mt-2">
              <Badge variant="secondary" className="text-xs">
                {stats.blockedSlots} blokad
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Management Interface */}
      <Card>
        <CardHeader>
          <CardTitle>Zarządzanie Zespołem i Terapeutami</CardTitle>
          <CardDescription>
            Kompleksowe zarządzanie zespołem, terapeutami, grafikami i kalendarzami
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Przegląd zespołu</TabsTrigger>
              <TabsTrigger value="schedules">Grafiki i harmonogramy</TabsTrigger>
              <TabsTrigger value="calendar">Kalendarze zarządzania</TabsTrigger>
              <TabsTrigger value="blocked">Blokady czasu</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="space-y-6">
                <UnifiedTeamDisplay />
                <TeamMembersManager />
              </div>
            </TabsContent>

            <TabsContent value="schedules" className="mt-6">
              <UnifiedScheduleManager />
            </TabsContent>

            <TabsContent value="calendar" className="mt-6">
              <EnhancedCalendarManager />
            </TabsContent>

            <TabsContent value="blocked" className="mt-6">
              <BlockedSlotsManager />
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}