import React, { useEffect, useState } from "react";
import { format, addDays, subWeeks, addWeeks, startOfWeek, endOfWeek, isToday, isBefore, isAfter, setHours, setMinutes } from "date-fns";
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

  // Funkcja do uzyskania kolorów na podstawie statusu wizyty
  const getAppointmentStatusColors = (status: string) => {
    switch (status) {
      case 'confirmed':
        return {
          gradient: "from-emerald-500 to-green-600", // Zielony dla potwierdzonych
          text: "text-white",
          glow: "shadow-emerald-500/30"
        };
      case 'cancelled':
        return {
          gradient: "from-red-500 to-rose-600", // Czerwony dla anulowanych
          text: "text-white",
          glow: "shadow-red-500/30"
        };
      case 'pending':
        return {
          gradient: "from-amber-400 to-yellow-500", // Żółty dla oczekujących
          text: "text-gray-900",
          glow: "shadow-yellow-500/30"
        };
      default:
        return {
          gradient: "from-pink-400 to-rose-500", // Kolor wiśni japonskiej jako domyślny
          text: "text-white",
          glow: "shadow-pink-500/30"
        };
    }
  };

  // Sprawdź czy wizyta już się odbyła
  const isAppointmentPast = (appointmentDate: string, appointmentTime: string) => {
    const now = new Date();
    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    return isBefore(appointmentDateTime, now);
  };

  // Sprawdź czy to aktualny czas
  const isCurrentTimeSlot = (time: string, day: Date) => {
    if (!isToday(day)) return false;
    
    const now = new Date();
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
    const slotTimeMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);
    const nextSlotTimeMinutes = slotTimeMinutes + 30;
    
    return currentTimeMinutes >= slotTimeMinutes && currentTimeMinutes < nextSlotTimeMinutes;
  };

  // Anuluj wizytę
  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appointmentId);

      if (error) throw error;

      toast({
        title: "Wizyta anulowana",
        description: "Wizyta została anulowana. Slot czasowy jest teraz wolny.",
      });

      // Odśwież dane
      fetchAppointments();
    } catch (error: any) {
      console.error("Error cancelling appointment:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się anulować wizyty",
        variant: "destructive",
      });
    }
  };

  // Przywróć wizytę (zmień z anulowanej na potwierdzoną)
  const handleRestoreAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "confirmed" })
        .eq("id", appointmentId);

      if (error) throw error;

      toast({
        title: "Wizyta przywrócona",
        description: "Wizyta została przywrócona i slot jest ponownie zajęty.",
      });

      // Odśwież dane
      fetchAppointments();
    } catch (error: any) {
      console.error("Error restoring appointment:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się przywrócić wizyty",
        variant: "destructive",
      });
    }
  };

  // Renderuj wskaźnik aktualnej godziny
  const renderCurrentTimeIndicator = (time: string, day: Date) => {
    if (!isCurrentTimeSlot(time, day)) return null;
    
    return (
      <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 z-10">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded-full shadow-lg animate-pulse"></div>
          <div className="flex-1 h-0.5 bg-red-500 shadow-lg"></div>
        </div>
      </div>
    );
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
                      
                      const isTodayDay = dayString === format(new Date(), "yyyy-MM-dd");
                      const isPastDay = day < new Date();
                      const currentTimeIndicator = renderCurrentTimeIndicator(time, day);
                      
                      return (
                        <div
                          key={dayString}
                          className={`relative p-2 min-h-[60px] bg-white transition-all duration-300 group ${
                            isTodayDay ? "border-l-2 border-pink-400" : ""
                          } ${isPastDay ? "opacity-60" : ""} hover:bg-gradient-to-br hover:from-pink-50 hover:to-rose-50`}
                        >
                          {/* Wskaźnik aktualnej godziny */}
                          {currentTimeIndicator}
                          
                          {dayAppointments.map((appointment) => {
                            const colors = getAppointmentStatusColors(appointment.status);
                            const isPastAppointment = isAppointmentPast(appointment.appointment_date, appointment.appointment_time);
                            
                            return (
                              <div
                                key={appointment.id}
                                className={`relative p-3 rounded-xl text-xs shadow-lg hover:shadow-xl transition-all duration-300 group/appointment cursor-pointer animate-fade-in mb-1 overflow-hidden ${
                                  isPastAppointment ? "opacity-50 grayscale" : ""
                                } bg-gradient-to-r ${colors.gradient} ${colors.text} ${colors.glow}`}
                              >
                                <div className="font-semibold mb-1 transition-colors duration-200">
                                  {appointment.services?.name}
                                </div>
                                <div className="opacity-90 transition-colors duration-200">
                                  {getClientName(appointment)}
                                </div>
                                <div className="text-xs mt-1 opacity-80 capitalize">
                                  Status: {appointment.status === 'confirmed' ? 'Potwierdzona' : 
                                           appointment.status === 'cancelled' ? 'Anulowana' :
                                           appointment.status === 'pending' ? 'Oczekująca' : appointment.status}
                                </div>
                                {appointment.is_guest && (
                                  <div className="opacity-80 mt-1 text-xs transition-colors duration-200">
                                    📞 {appointment.guest_phone}
                                  </div>
                                )}
                                
                                {/* Przyciski akcji - widoczne tylko przy hover */}
                                <div className="absolute top-1 right-1 opacity-0 group-hover/appointment:opacity-100 transition-opacity duration-200 flex space-x-1">
                                  {appointment.status === 'confirmed' && !isPastAppointment && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCancelAppointment(appointment.id);
                                      }}
                                      className="w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold transition-colors duration-200"
                                      title="Anuluj wizytę"
                                    >
                                      ×
                                    </button>
                                  )}
                                  {appointment.status === 'cancelled' && !isPastAppointment && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRestoreAppointment(appointment.id);
                                      }}
                                      className="w-5 h-5 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold transition-colors duration-200"
                                      title="Przywróć wizytę"
                                    >
                                      ↺
                                    </button>
                                  )}
                                </div>
                                
                                {isPastAppointment && (
                                  <div className="absolute top-1 right-1 text-xs opacity-75">
                                    ✓
                                  </div>
                                )}
                                
                                <div className="absolute inset-0 bg-white/0 group-hover/appointment:bg-white/10 rounded-xl transition-colors duration-300"></div>
                              </div>
                            );
                          })}
                          
                          {dayAppointments.length === 0 && !isPastDay && (
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
          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 shadow-sm"></div>
              <span className="text-sm text-gray-600 font-medium">Potwierdzona</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 shadow-sm"></div>
              <span className="text-sm text-gray-600 font-medium">Oczekująca</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-500 to-rose-600 shadow-sm"></div>
              <span className="text-sm text-gray-600 font-medium">Anulowana</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-sm"></div>
              <div className="w-8 h-0.5 bg-red-500"></div>
              <span className="text-sm text-gray-600 font-medium">Aktualny czas</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-pink-400 to-rose-500 shadow-sm"></div>
              <span className="text-sm text-gray-600 font-medium">Wiśnia japońska</span>
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