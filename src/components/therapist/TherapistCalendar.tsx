import { useState, useEffect } from "react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CreateAppointmentDialog from "@/components/therapist/CreateAppointmentDialog";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  user_id?: string;
  status: string;
  services: {
    name: string;
    duration: number;
  };
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

interface TherapistCalendarProps {
  therapistId: string;
}

const TherapistCalendar = ({ therapistId }: TherapistCalendarProps) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  const timeSlots = [
    "08:00", "09:00", "10:00", "11:00", "12:00", 
    "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
  ];

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    fetchAppointments();
  }, [currentWeek, therapistId]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const weekEnd = addDays(weekStart, 6);
      
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          appointment_time,
          user_id,
          status,
          services (
            name,
            duration
          )
        `)
        .eq("therapist_id", therapistId)
        .gte("appointment_date", format(weekStart, "yyyy-MM-dd"))
        .lte("appointment_date", format(weekEnd, "yyyy-MM-dd"))
        .order("appointment_time");

      if (error) throw error;
      setAppointments(data || []);
    } catch (error: any) {
      console.error("Error fetching appointments:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować wizyt",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getAppointmentForSlot = (day: Date, time: string) => {
    return appointments.find(apt => 
      isSameDay(parseISO(apt.appointment_date), day) && 
      apt.appointment_time === time + ":00"
    );
  };

  const getClientName = (appointment: Appointment) => {
    return "Klient"; // Simplified for now until migration is applied
  };

  const previousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const nextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hanami-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-light">
            Kalendarz wizyt
          </CardTitle>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Dodaj wizytę
          </Button>
        </CardHeader>
        <CardContent>
          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="outline" onClick={previousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-medium">
              {format(weekStart, "d MMMM", { locale: pl })} - {format(addDays(weekStart, 6), "d MMMM yyyy", { locale: pl })}
            </h3>
            <Button variant="outline" onClick={nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header with days */}
              <div className="grid grid-cols-8 gap-2 mb-2">
                <div className="p-2 text-sm font-medium text-hanami-neutral">Godzina</div>
                {weekDays.map((day) => (
                  <div key={day.toISOString()} className="p-2 text-center text-sm font-medium">
                    <div>{format(day, "EEEE", { locale: pl })}</div>
                    <div className="text-hanami-neutral">{format(day, "d.MM")}</div>
                  </div>
                ))}
              </div>

              {/* Time slots */}
              {timeSlots.map((time) => (
                <div key={time} className="grid grid-cols-8 gap-2 mb-1">
                  <div className="p-2 text-sm text-hanami-neutral border-r">
                    {time}
                  </div>
                  {weekDays.map((day) => {
                    const appointment = getAppointmentForSlot(day, time);
                    return (
                      <div
                        key={`${day.toISOString()}-${time}`}
                        className="p-1 min-h-[60px] border border-hanami-neutral/20 rounded"
                      >
                        {appointment && (
                          <div className={`
                            p-2 rounded text-xs h-full
                            ${appointment.status === 'confirmed' ? 'bg-hanami-primary/20 text-hanami-primary' : ''}
                            ${appointment.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                            ${appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' : ''}
                          `}>
                            <div className="font-medium">
                              {getClientName(appointment)}
                            </div>
                            <div className="text-hanami-neutral">
                              {appointment.services?.name}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <CreateAppointmentDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchAppointments}
        therapistId={therapistId}
      />
    </div>
  );
};

export default TherapistCalendar;