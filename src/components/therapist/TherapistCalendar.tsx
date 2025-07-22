import React, { useEffect, useState } from "react";
import { format, addDays, subWeeks, addWeeks, startOfWeek, endOfWeek } from "date-fns";
import { pl } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CreateAppointmentDialog from "./CreateAppointmentDialog";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  user_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  is_guest: boolean;
  status: string;
  services?: {
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
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  // Generowanie godzin co 30 minut
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 18 && minute > 0) break; // Kończymy o 18:00
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday start
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
      <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
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
      <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <CardTitle className="text-2xl font-light bg-gradient-to-r from-hanami-primary to-hanami-accent bg-clip-text text-transparent">
            Kalendarz wizyt
          </CardTitle>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-gradient-to-r from-hanami-primary to-hanami-accent hover:from-hanami-accent hover:to-hanami-primary transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
          >
            <Plus className="h-4 w-4 mr-2" />
            Dodaj wizytę
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-8">
            <Button 
              variant="outline" 
              onClick={previousWeek}
              className="rounded-xl border-gray-200 hover:bg-gray-50 hover:border-hanami-primary transition-all duration-300 hover:scale-105 hover:shadow-md"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-xl font-medium text-gray-800 bg-white px-6 py-2 rounded-2xl shadow-sm border border-gray-100">
              {format(weekStart, "d MMMM", { locale: pl })} - {format(addDays(weekStart, 6), "d MMMM yyyy", { locale: pl })}
            </h3>
            <Button 
              variant="outline" 
              onClick={nextWeek}
              className="rounded-xl border-gray-200 hover:bg-gray-50 hover:border-hanami-primary transition-all duration-300 hover:scale-105 hover:shadow-md"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[900px] bg-white rounded-2xl shadow-lg border border-gray-100">
              {/* Header with days */}
              <div className="grid grid-cols-8 gap-px bg-gray-100 rounded-t-2xl overflow-hidden">
                <div className="p-4 text-sm font-semibold text-gray-600 bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
                  Godzina
                </div>
                {weekDays.map((day, index) => {
                  const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                  return (
                    <div 
                      key={day.toISOString()} 
                      className={`p-4 text-center text-sm font-semibold transition-all duration-300 ${
                        isToday 
                          ? "bg-gradient-to-br from-hanami-primary/10 to-hanami-accent/10 text-hanami-primary" 
                          : "bg-gradient-to-br from-gray-50 to-white text-gray-700 hover:from-hanami-primary/5 hover:to-hanami-accent/5"
                      }`}
                    >
                      <div className={`transition-all duration-300 ${isToday ? "font-bold" : ""}`}>
                        {format(day, "EEEE", { locale: pl })}
                      </div>
                      <div className={`mt-1 px-2 py-1 rounded-lg inline-block transition-all duration-300 ${
                        isToday 
                          ? "bg-hanami-primary text-white shadow-md" 
                          : "text-gray-500"
                      }`}>
                        {format(day, "d.MM")}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Time slots */}
              <div className="divide-y divide-gray-100">
                {timeSlots.map((time, timeIndex) => (
                  <div key={time} className="grid grid-cols-8 gap-px bg-gray-50">
                    {/* Time label */}
                    <div className="p-4 text-sm font-medium text-gray-600 bg-white flex items-center justify-center border-r border-gray-100">
                      <span className="px-3 py-1 bg-gray-50 rounded-lg">{time}</span>
                    </div>
                    
                    {/* Day cells */}
                    {weekDays.map((day, dayIndex) => {
                      const dayString = format(day, "yyyy-MM-dd");
                      const dayAppointments = appointments.filter(
                        apt => apt.appointment_date === dayString && apt.appointment_time.slice(0, 5) === time
                      );
                      
                      const isToday = dayString === format(new Date(), "yyyy-MM-dd");
                      const isPast = day < new Date();
                      
                      return (
                        <div
                          key={dayString}
                          className={`p-2 min-h-[60px] bg-white hover:bg-gradient-to-br hover:from-hanami-primary/5 hover:to-hanami-accent/5 transition-all duration-300 group ${
                            isToday ? "border-l-2 border-hanami-primary" : ""
                          } ${isPast ? "opacity-60" : ""}`}
                        >
                          {dayAppointments.map((appointment) => (
                            <div
                              key={appointment.id}
                              className="p-3 rounded-xl text-xs bg-gradient-to-r from-hanami-primary to-hanami-accent text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group/appointment cursor-pointer animate-fade-in mb-1 relative overflow-hidden"
                            >
                              <div className="font-semibold mb-1 group-hover/appointment:text-yellow-200 transition-colors duration-200">
                                {appointment.services?.name}
                              </div>
                              <div className="text-white/90 group-hover/appointment:text-white transition-colors duration-200">
                                {getClientName(appointment)}
                              </div>
                              {appointment.is_guest && (
                                <div className="text-white/80 mt-1 text-xs group-hover/appointment:text-white/90 transition-colors duration-200">
                                  📞 {appointment.guest_phone}
                                </div>
                              )}
                              <div className="absolute inset-0 bg-white/0 group-hover/appointment:bg-white/10 rounded-xl transition-colors duration-300"></div>
                            </div>
                          ))}
                          {dayAppointments.length === 0 && !isPast && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-xs text-gray-400 text-center mt-4">
                              Wolny termin
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-8">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-hanami-primary to-hanami-accent shadow-sm"></div>
              <span className="text-sm text-gray-600 font-medium">Potwierdzona wizyta</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full border-2 border-hanami-primary bg-white shadow-sm"></div>
              <span className="text-sm text-gray-600 font-medium">Dzisiejszy dzień</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-gray-200 opacity-60"></div>
              <span className="text-sm text-gray-600 font-medium">Przeszłe terminy</span>
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