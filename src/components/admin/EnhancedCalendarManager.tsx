import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Eye, Settings, Users, Clock } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Import calendar components
import TherapistsCalendarsView from "@/pages/TherapistsCalendars";
import CreateAppointmentDialog from "@/components/admin/CreateAppointmentDialog";

interface CalendarStats {
  totalAppointments: number;
  todayAppointments: number;
  weekAppointments: number;
  availableSlots: number;
}

export function EnhancedCalendarManager() {
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [stats, setStats] = useState<CalendarStats>({
    totalAppointments: 0,
    todayAppointments: 0,
    weekAppointments: 0,
    availableSlots: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showCreateAppointment, setShowCreateAppointment] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      loadCalendarStats();
    }
  }, [isAdmin, adminLoading]);

  const loadCalendarStats = async () => {
    try {
      setLoading(true);

      const today = new Date().toISOString().split('T')[0];
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      // Get today's appointments
      const { data: todayAppts, error: todayError } = await supabase
        .from("appointments")
        .select("id")
        .eq("appointment_date", today)
        .neq("status", "cancelled");

      if (todayError) throw todayError;

      // Get this week's appointments
      const { data: weekAppts, error: weekError } = await supabase
        .from("appointments")
        .select("id")
        .gte("appointment_date", weekStart.toISOString().split('T')[0])
        .lte("appointment_date", weekEnd.toISOString().split('T')[0])
        .neq("status", "cancelled");

      if (weekError) throw weekError;

      // Get total appointments (active)
      const { data: totalAppts, error: totalError } = await supabase
        .from("appointments")
        .select("id")
        .neq("status", "cancelled");

      if (totalError) throw totalError;

      // Calculate available slots (simplified estimate)
      const { data: schedules, error: schedulesError } = await supabase
        .from("therapist_schedules")
        .select("start_time, end_time")
        .eq("status", "approved")
        .eq("is_active", true);

      if (schedulesError) throw schedulesError;

      const availableSlots = schedules?.reduce((total, schedule) => {
        const start = new Date(`1970-01-01T${schedule.start_time}`);
        const end = new Date(`1970-01-01T${schedule.end_time}`);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + Math.max(0, Math.floor(hours * 2)); // Assuming 30-min slots
      }, 0) || 0;

      setStats({
        totalAppointments: totalAppts?.length || 0,
        todayAppointments: todayAppts?.length || 0,
        weekAppointments: weekAppts?.length || 0,
        availableSlots: availableSlots * 7, // Weekly slots
      });
    } catch (error: any) {
      console.error("Error loading calendar stats:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować statystyk kalendarza",
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
      {/* Calendar Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Dzisiaj
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayAppointments}</div>
            <p className="text-xs text-muted-foreground">wizyt zaplanowanych</p>
            {stats.todayAppointments > 0 && (
              <Badge variant="default" className="mt-2 text-xs">
                Aktywny dzień
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Ten tydzień
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.weekAppointments}</div>
            <p className="text-xs text-muted-foreground">wizyt w tygodniu</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Wszystkie wizyty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAppointments}</div>
            <p className="text-xs text-muted-foreground">aktywnych wizyt</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Dostępne sloty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.availableSlots}</div>
            <p className="text-xs text-muted-foreground">slotów tygodniowo</p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Calendar Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Kalendarze i Zarządzanie Wizytami
              </CardTitle>
              <CardDescription>
                Przegląd kalendarzy terapeutów z możliwością zarządzania wizytami
              </CardDescription>
            </div>
            <Button 
              onClick={() => setShowCreateAppointment(true)}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Dodaj wizytę
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Przegląd kalendarzy
              </TabsTrigger>
              <TabsTrigger value="management" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Zarządzanie wizytami
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <TherapistsCalendarsView embedded={true} />
            </TabsContent>

            <TabsContent value="management" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Narzędzia zarządzania</CardTitle>
                  <CardDescription>
                    Szybkie akcje i narzędzia do zarządzania wizytami i kalendarzami
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex-col gap-2"
                      onClick={() => setShowCreateAppointment(true)}
                    >
                      <Calendar className="h-6 w-6" />
                      <div className="text-center">
                        <div className="font-medium">Nowa wizyta</div>
                        <div className="text-xs text-muted-foreground">Zarezerwuj wizytę dla klienta</div>
                      </div>
                    </Button>

                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex-col gap-2"
                      onClick={() => window.open('/admin/appointments', '_blank')}
                    >
                      <Users className="h-6 w-6" />
                      <div className="text-center">
                        <div className="font-medium">Zarządzaj wizytami</div>
                        <div className="text-xs text-muted-foreground">Edytuj istniejące wizyty</div>
                      </div>
                    </Button>

                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex-col gap-2"
                      onClick={() => loadCalendarStats()}
                    >
                      <Settings className="h-6 w-6" />
                      <div className="text-center">
                        <div className="font-medium">Odśwież dane</div>
                        <div className="text-xs text-muted-foreground">Aktualizuj statystyki</div>
                      </div>
                    </Button>
                  </div>

                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Szybkie statystyki</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="font-medium">{stats.todayAppointments}</div>
                        <div className="text-muted-foreground">Dzisiaj</div>
                      </div>
                      <div>
                        <div className="font-medium">{stats.weekAppointments}</div>
                        <div className="text-muted-foreground">Ten tydzień</div>
                      </div>
                      <div>
                        <div className="font-medium">{stats.totalAppointments}</div>
                        <div className="text-muted-foreground">Wszystkie</div>
                      </div>
                      <div>
                        <div className="font-medium">{stats.availableSlots}</div>
                        <div className="text-muted-foreground">Sloty/tydzień</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Appointment Dialog */}
      <CreateAppointmentDialog
        open={showCreateAppointment}
        onOpenChange={setShowCreateAppointment}
        onSuccess={() => {
          setShowCreateAppointment(false);
          loadCalendarStats();
        }}
      />
    </div>
  );
}