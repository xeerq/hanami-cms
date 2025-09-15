import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Plus, Filter, Users } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Import existing managers
import { ScheduleApprovalManager } from "@/components/admin/ScheduleApprovalManager";
import { TherapistScheduleManager } from "@/components/admin/TherapistScheduleManager";

interface ScheduleStats {
  pendingApprovals: number;
  totalSchedules: number;
  activeTherapists: number;
  weeklySlots: number;
}

export function UnifiedScheduleManager() {
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [stats, setStats] = useState<ScheduleStats>({
    pendingApprovals: 0,
    totalSchedules: 0,
    activeTherapists: 0,
    weeklySlots: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      loadScheduleStats();
    }
  }, [isAdmin, adminLoading]);

  const loadScheduleStats = async () => {
    try {
      setLoading(true);

      // Get pending schedules
      const { data: pending, error: pendingError } = await supabase
        .from("therapist_schedules")
        .select("id")
        .eq("status", "pending");

      if (pendingError) throw pendingError;

      // Get total approved schedules
      const { data: total, error: totalError } = await supabase
        .from("therapist_schedules")
        .select("id")
        .eq("status", "approved")
        .eq("is_active", true);

      if (totalError) throw totalError;

      // Get active therapists with schedules
      const { data: therapists, error: therapistsError } = await supabase
        .from("therapists")
        .select("id")
        .eq("is_active", true);

      if (therapistsError) throw therapistsError;

      // Calculate weekly slots (sum of all approved schedule hours)
      const { data: schedules, error: schedulesError } = await supabase
        .from("therapist_schedules")
        .select("start_time, end_time")
        .eq("status", "approved")
        .eq("is_active", true);

      if (schedulesError) throw schedulesError;

      const weeklySlots = schedules?.reduce((total, schedule) => {
        const start = new Date(`1970-01-01T${schedule.start_time}`);
        const end = new Date(`1970-01-01T${schedule.end_time}`);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + Math.max(0, hours);
      }, 0) || 0;

      setStats({
        pendingApprovals: pending?.length || 0,
        totalSchedules: total?.length || 0,
        activeTherapists: therapists?.length || 0,
        weeklySlots: Math.round(weeklySlots),
      });
    } catch (error: any) {
      console.error("Error loading schedule stats:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować statystyk grafików",
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
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Do zatwierdzenia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">oczekujących grafików</p>
            {stats.pendingApprovals > 0 && (
              <Badge variant="secondary" className="mt-2 text-xs">
                Wymaga akcji
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Aktywne grafiki
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSchedules}</div>
            <p className="text-xs text-muted-foreground">zatwierdzonych slotów</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Terapeuci
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeTherapists}</div>
            <p className="text-xs text-muted-foreground">aktywnych terapeutów</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Godziny tygodniowo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.weeklySlots}h</div>
            <p className="text-xs text-muted-foreground">dostępnych godzin</p>
          </CardContent>
        </Card>
      </div>

      {/* Unified Schedule Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Zarządzanie Grafikami i Harmonogramami
          </CardTitle>
          <CardDescription>
            Kompleksowe zarządzanie zatwierdzaniem i administracją grafików terapeutów
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="approval" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="approval" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Zatwierdzanie grafików
                {stats.pendingApprovals > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {stats.pendingApprovals}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="management" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Administracja grafików
              </TabsTrigger>
            </TabsList>

            <TabsContent value="approval" className="mt-6">
              <ScheduleApprovalManager />
            </TabsContent>

            <TabsContent value="management" className="mt-6">
              <TherapistScheduleManager />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}