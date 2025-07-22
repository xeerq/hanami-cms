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
  guest_name?: string;
  guest_phone?: string;
  is_guest: boolean;
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

  // Generowanie godzin co 15 minut - tak samo jak w dialog'u
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        if (hour === 18 && minute > 0) break; // Kończymy o 18:00
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    fetchAppointments();
  }, [currentWeek, therapistId]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const weekEnd = addDays(weekStart, 6);
      
      console.log("Fetching appointments for week:", {
        weekStart: format(weekStart, "yyyy-MM-dd"),
        weekEnd: format(weekEnd, "yyyy-MM-dd"),
        therapistId
      });
      
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          appointment_time,
          user_id,
          guest_name,
          guest_phone,
          is_guest,
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

      console.log("Raw appointments data:", data);
      
      if (error) throw error;
      
      // Po pobraniu wizyt, pobieramy dodatkowe dane o klientach jeśli potrzebne
      const appointmentsWithProfiles = await Promise.all(
        (data || []).map(async (appointment) => {
          if (!appointment.is_guest && appointment.user_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("first_name, last_name")
              .eq("user_id", appointment.user_id)
              .single();
            
            return { ...appointment, profiles: profile };
          }
          return appointment;
        })
      );
      
      console.log("Final appointments with profiles:", appointmentsWithProfiles);
      setAppointments(appointmentsWithProfiles as Appointment[]);
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

  const isTimeSlotBlocked = (day: Date, time: string) => {
    const currentTimeMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);
    
    return appointments.some(apt => {
      const isSameDate = isSameDay(parseISO(apt.appointment_date), day);
      if (!isSameDate) return false;
      
      const appointmentTime = apt.appointment_time.slice(0, 5); // Remove seconds
      const appointmentTimeMinutes = parseInt(appointmentTime.split(':')[0]) * 60 + parseInt(appointmentTime.split(':')[1]);
      const serviceDurationMinutes = apt.services?.duration || 60; // Default 60 minutes if duration not available
      
      // Check if current time slot is within the appointment duration
      return currentTimeMinutes >= appointmentTimeMinutes && 
             currentTimeMinutes < appointmentTimeMinutes + serviceDurationMinutes;
    });
  };

  const getAppointmentForSlot = (day: Date, time: string) => {
    // Return the main appointment (the one that starts at this time)
    const appointment = appointments.find(apt => {
      const isSameDate = isSameDay(parseISO(apt.appointment_date), day);
      const isSameTime = apt.appointment_time === time + ":00";
      
      return isSameDate && isSameTime;
    });
    
    return appointment;
  };

  const getClientName = (appointment: Appointment) => {
    if (appointment.is_guest) {
      return appointment.guest_name || "Gość";
    }
    return appointment.profiles 
      ? `${appointment.profiles.first_name} ${appointment.profiles.last_name}`
      : "Nieznany klient";
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
                    const isBlocked = isTimeSlotBlocked(day, time);
                    const isMainAppointment = appointment !== undefined;
                    
                    return (
                      <div
                        key={`${day.toISOString()}-${time}`}
                        className={`
                          p-1 min-h-[60px] border border-hanami-neutral/20 rounded
                          ${isBlocked && !isMainAppointment ? 'bg-hanami-neutral/10' : ''}
                        `}
                      >
                        {isMainAppointment && (
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
                            <div className="text-xs text-hanami-neutral">
                              {appointment.services?.duration} min
                            </div>
                            {appointment.is_guest && appointment.guest_phone && (
                              <div className="text-xs text-hanami-neutral">
                                Tel: {appointment.guest_phone}
                              </div>
                            )}
                          </div>
                        )}
                        {isBlocked && !isMainAppointment && (
                          <div className="text-xs text-hanami-neutral/60 p-1">
                            Zajęte
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