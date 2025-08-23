import React, { useEffect, useState } from "react";
import { format, addDays, subWeeks, addWeeks, startOfWeek, endOfWeek, isToday, isBefore, isAfter, setHours, setMinutes } from "date-fns";
import { pl } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CreateAppointmentDialog from "./CreateAppointmentDialog";
import AppointmentDetailsDialog from "./AppointmentDetailsDialog";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  user_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  is_guest: boolean;
  status: string;
  notes?: string;
  voucher_code?: string;
  voucher_info?: {
    display: string;
    is_voucher: boolean;
    type: string;
  };
  services?: {
    name: string;
    duration: number;
    price: number;
    description?: string;
  };
  profiles?: {
    first_name: string;
    last_name: string;
    phone?: string;
  };
  duration?: number;
}


interface TherapistCalendarProps {
  therapistId: string;
}

const TherapistCalendar = ({ therapistId }: TherapistCalendarProps) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [therapistSchedule, setTherapistSchedule] = useState<any[]>([]);
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
    fetchTherapistSchedule();
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
          notes,
          voucher_code,
          duration,
          services (
            name,
            duration,
            price,
            description
          )
        `)
        .eq("therapist_id", therapistId)
        .gte("appointment_date", format(weekStart, "yyyy-MM-dd"))
        .lte("appointment_date", format(weekEnd, "yyyy-MM-dd"))
        .order("appointment_time");

      console.log("Raw appointments data:", data);
      
      if (error) throw error;
      
      // Po pobraniu wizyt, pobieramy dodatkowe dane o klientach i bonach
      const appointmentsWithProfiles = await Promise.all(
        (data || []).map(async (appointment) => {
          let updatedAppointment: any = { ...appointment };
          
          // Pobierz profil użytkownika jeśli potrzebne
          if (!appointment.is_guest && appointment.user_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("first_name, last_name, phone")
              .eq("user_id", appointment.user_id)
              .single();
            
            updatedAppointment.profiles = profile;
          }
          
          // Pobierz informacje o bonie jeśli istnieje
          if (appointment.voucher_code) {
            try {
              const { data: voucherInfo, error: voucherError } = await supabase
                .rpc('get_voucher_usage_info', { p_voucher_code: appointment.voucher_code });
              
              if (voucherError) {
                console.error("Error fetching voucher info:", voucherError);
              } else if (voucherInfo && typeof voucherInfo === 'object' && 'success' in voucherInfo && voucherInfo.success) {
                updatedAppointment.voucher_info = voucherInfo;
              }
            } catch (error) {
              console.error("Error fetching voucher info:", error);
            }
          }
          
          return updatedAppointment;
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

  const fetchTherapistSchedule = async () => {
    try {
      const { data, error } = await supabase
        .from("therapist_schedules")
        .select("*")
        .eq("therapist_id", therapistId)
        .eq("status", "approved")
        .eq("is_active", true);

      if (error) throw error;
      setTherapistSchedule(data || []);
    } catch (error: any) {
      console.error("Error fetching therapist schedule:", error);
    }
  };

  // Check if a time slot is blocked based on therapist schedule
  const isTimeSlotBlocked = (time: string, day: Date) => {
    const dayOfWeek = day.getDay(); // 0=Sunday, 6=Saturday
    const [hour, minute] = time.split(':').map(Number);
    const timeMinutes = hour * 60 + minute;

    // Check if therapist has any approved schedule for this day
    const daySchedules = therapistSchedule.filter(schedule => schedule.day_of_week === dayOfWeek);
    
    if (daySchedules.length === 0) {
      // No schedule for this day - blocked
      return true;
    }

    // Check if the time slot falls within any approved schedule
    const isWithinSchedule = daySchedules.some(schedule => {
      const [startHour, startMinute] = schedule.start_time.split(':').map(Number);
      const [endHour, endMinute] = schedule.end_time.split(':').map(Number);
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;
      
      return timeMinutes >= startMinutes && timeMinutes < endMinutes;
    });

    return !isWithinSchedule;
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

  // Obsługa zmiany statusu wizyty
  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      // Jeśli wizyta ma status "completed" i ma voucher_code, sprawdź czy bon został już przetworzony
      if (newStatus === 'completed') {
        const appointment = appointments.find(app => app.id === appointmentId);
        if (appointment && appointment.voucher_code) {
          // Sprawdź czy bon został już przetworzony dla tej wizyty
          const { data: existingRedemption, error: checkError } = await supabase
            .from('voucher_redemptions')
            .select('id')
            .eq('appointment_id', appointmentId)
            .maybeSingle();

          if (checkError) {
            console.error("Error checking existing voucher redemption:", checkError);
          }

          // Jeśli bon nie został jeszcze przetworzony, zrób to teraz
          if (!existingRedemption) {
            const servicePrice = appointment.services?.price;
            const { data: voucherResult, error: voucherError } = await supabase
              .rpc('process_voucher_redemption', {
                p_voucher_code: appointment.voucher_code,
                p_appointment_id: appointmentId,
                ...(servicePrice && { p_service_price: servicePrice })
              });

            if (voucherError) {
              console.error("Voucher redemption error:", voucherError);
              toast({
                title: "Problem z bonem",
                description: `Błąd przy przetwarzaniu bonu: ${voucherError.message}`,
                variant: "destructive",
              });
              return;
            } else if (voucherResult && typeof voucherResult === 'object' && 'success' in voucherResult) {
              if (!voucherResult.success) {
                toast({
                  title: "Problem z bonem",
                  description: `Nie udało się przetworzyć bonu: ${voucherResult.error}`,
                  variant: "destructive",
                });
                return;
              } else {
                toast({
                  title: "Bon przetworzony",
                  description: "Bon został pomyślnie zrealizowany za wizytę",
                  variant: "default",
                });
              }
            }
          }
        }
      }

      // Aktualizuj status wizyty w bazie danych

      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", appointmentId);

      if (error) throw error;

      toast({
        title: "Status zmieniony",
        description: `Status wizyty został zmieniony na ${
          newStatus === 'confirmed' ? 'potwierdzona' :
          newStatus === 'cancelled' ? 'anulowana' :
          newStatus === 'pending' ? 'oczekująca' :
          newStatus === 'completed' ? 'zakończona' : newStatus
        }.`,
      });

      // Odśwież dane
      fetchAppointments();
      setShowDetailsDialog(false);
    } catch (error: any) {
      console.error("Error updating appointment status:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zmienić statusu wizyty",
        variant: "destructive",
      });
    }
  };

  // Obsługa kliknięcia w wizytę
  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsDialog(true);
  };

  // Oblicz pozycję i rozmiar wizyty w CSS Grid
  const getAppointmentGridPosition = (appointment: Appointment) => {
    const [startHour, startMinute] = appointment.appointment_time.split(':').map(Number);
    const duration = appointment.duration ?? appointment.services?.duration ?? 30;
    
    // Znajdź pozycję startową w gridzie (8:00 = row 1, 8:30 = row 2, itd.)
    const startRow = ((startHour - 8) * 2) + (startMinute / 30) + 2; // +2 dla headera
    const durationInSlots = Math.ceil(duration / 30);
    
    return {
      gridRowStart: startRow,
      gridRowEnd: startRow + durationInSlots,
    };
  };

  // Znajdź konflikty czasowe dla danego dnia
  const getTimeConflicts = (dayAppointments: Appointment[]) => {
    const conflicts: { [key: string]: Appointment[] } = {};
    
    dayAppointments.forEach(appointment => {
      const startTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + (appointment.duration ?? appointment.services?.duration ?? 30));
      
      // Sprawdź nakładanie z innymi wizytami
      const overlapping = dayAppointments.filter(other => {
        if (other.id === appointment.id) return false;
        
        const otherStart = new Date(`${other.appointment_date}T${other.appointment_time}`);
        const otherEnd = new Date(otherStart);
        otherEnd.setMinutes(otherEnd.getMinutes() + (other.duration ?? other.services?.duration ?? 30));
        
        return (startTime < otherEnd && endTime > otherStart);
      });
      
      if (overlapping.length > 0) {
        const conflictKey = [appointment, ...overlapping]
          .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
          .map(a => a.id)
          .join('-');
        
        if (!conflicts[conflictKey]) {
          conflicts[conflictKey] = [appointment, ...overlapping];
        }
      }
    });
    
    return conflicts;
  };

  // Oblicz szerokość i pozycję poziomą dla konfliktujących wizyt
  const getConflictLayout = (appointment: Appointment, conflicts: { [key: string]: Appointment[] }) => {
    for (const [key, conflictGroup] of Object.entries(conflicts)) {
      if (conflictGroup.some(a => a.id === appointment.id)) {
        const sortedGroup = conflictGroup.sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
        const index = sortedGroup.findIndex(a => a.id === appointment.id);
        const totalCount = sortedGroup.length;
        
        return {
          width: `${100 / totalCount}%`,
          left: `${(index * 100) / totalCount}%`,
        };
      }
    }
    
    return { width: '100%', left: '0%' };
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

          {/* Calendar Grid with CSS Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[900px] bg-white rounded-2xl shadow-lg border border-gray-100">
              {/* CSS Grid Container */}
              <div 
                className="grid gap-0 rounded-2xl overflow-hidden border border-gray-200"
                style={{
                  gridTemplateColumns: 'minmax(100px, 120px) repeat(7, minmax(140px, 1fr))',
                  gridTemplateRows: `auto repeat(${timeSlots.length}, 60px)`,
                }}
              >
                {/* Header Row */}
                <div className="grid-header bg-gradient-to-br from-gray-50 to-white border-b border-r border-gray-200 p-3 text-sm font-semibold text-gray-600 flex items-center justify-center min-h-[80px]">
                  Godzina
                </div>
                {weekDays.map((day) => {
                  const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                  return (
                    <div 
                      key={`header-${day.toISOString()}`}
                      className={`grid-header border-b border-gray-200 p-3 text-center text-sm font-semibold transition-all duration-300 min-h-[80px] flex flex-col justify-center ${
                        isToday 
                          ? "bg-gradient-to-br from-hanami-primary/10 to-hanami-accent/10 text-hanami-primary" 
                          : "bg-gradient-to-br from-gray-50 to-white text-gray-700"
                      } ${day !== weekDays[weekDays.length - 1] ? "border-r border-gray-200" : ""}`}
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

                {timeSlots.map((time, timeIndex) => {
                  return (
                    <div className="contents" key={`row-${time}`}>
                      {/* Time Label */}
                      <div 
                        className="grid-time-label bg-white border-r border-gray-200 p-2 text-sm font-medium text-gray-600 flex items-center justify-center min-h-[60px]"
                        style={{ 
                          gridRow: timeIndex + 2,
                          gridColumn: 1,
                          borderBottom: timeIndex < timeSlots.length - 1 ? '1px solid rgb(229 231 235)' : 'none'
                        }}
                      >
                        <span className="px-2 py-1 bg-gray-50 rounded-lg font-mono text-xs">{time}</span>
                      </div>

                      {/* Day Cells */}
                      {weekDays.map((day, dayIndex) => {
                        const dayString = format(day, "yyyy-MM-dd");
                        const dayAppointments = appointments.filter(apt => apt.appointment_date === dayString);
                        const conflicts = getTimeConflicts(dayAppointments);
                        
                        const isTodayDay = dayString === format(new Date(), "yyyy-MM-dd");
                        const isPastDay = day < new Date();
                        const currentTimeIndicator = renderCurrentTimeIndicator(time, day);
                        
                        return (
                          <div
                            key={`cell-${dayString}-${time}`}
                            className={`grid-cell relative bg-white transition-all duration-300 group ${
                              isTodayDay ? "bg-hanami-primary/5" : ""
                            } ${isPastDay ? "opacity-60" : ""} hover:bg-gradient-to-br hover:from-pink-50 hover:to-rose-50`}
                            style={{ 
                              gridRow: timeIndex + 2,
                              gridColumn: dayIndex + 2,
                              borderRight: dayIndex < weekDays.length - 1 ? '1px solid rgb(229 231 235)' : 'none',
                              borderBottom: timeIndex < timeSlots.length - 1 ? '1px solid rgb(229 231 235)' : 'none'
                            }}
                          >
                            {/* Current Time Indicator */}
                            {currentTimeIndicator}
                            
                            {/* Show blocked time slots based on therapist schedule */}
                            {isTimeSlotBlocked(time, day) && (
                              <div className="absolute inset-0 bg-gray-300/50 backdrop-blur-sm flex items-center justify-center">
                                <div className="text-xs text-gray-600 font-medium bg-white/80 px-2 py-1 rounded">
                                  Niedostępny
                                </div>
                              </div>
                            )}
                            
                            {/* Empty slot indicator */}
                            {!isPastDay && !isTimeSlotBlocked(time, day) && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-xs text-gray-400 text-center absolute inset-0 flex items-center justify-center">
                                Wolny termin
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

               {/* Appointment Blocks - Pozycjonowane jako grid items */}
{weekDays.map((day, dayIndex) => {
  const dayString = format(day, "yyyy-MM-dd");
  const dayAppointments = appointments.filter(apt => apt.appointment_date === dayString);
  const conflicts = getTimeConflicts(dayAppointments);
  
  return (
    <div className="contents" key={`day-appointments-${dayString}`}>
      {dayAppointments.map((appointment) => {
        const gridPosition = getAppointmentGridPosition(appointment);
        const statusColors = getAppointmentStatusColors(appointment.status);
        const conflictLayout = getConflictLayout(appointment, conflicts);
        const isPast = isAppointmentPast(appointment.appointment_date, appointment.appointment_time);
        
        return (
          <div
            key={appointment.id}
            className={`p-2 rounded-lg border-2 border-white/20 shadow-lg cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:z-30 ${isPast ? 'opacity-75' : ''} bg-gradient-to-br ${statusColors.gradient} ${statusColors.text} ${statusColors.glow} backdrop-blur-sm`}
            style={{
              // KLUCZ: Użyj grid positioning zamiast absolute
              gridRow: `${gridPosition.gridRowStart} / ${gridPosition.gridRowEnd}`,
              gridColumn: dayIndex + 2,
              zIndex: 20,
              position: 'relative', // Zmiana z 'absolute' na 'relative'
              minHeight: '50px',
              fontSize: '12px',
              // Obsługa konfliktów - możesz użyć CSS transforms lub nested grid
              ...(conflictLayout.width !== '100%' && {
                left: conflictLayout.left,
                width: conflictLayout.width,
              })
            }}
            onClick={() => handleAppointmentClick(appointment)}
          >
            <div className="h-full flex flex-col justify-between space-y-1 p-1">
              {/* Header: Usługa i cena */}
              <div className="flex justify-between items-start min-h-[16px]">
                <div className="font-semibold text-xs leading-tight flex-1 pr-1 truncate">
                  {appointment.services?.name || "Nieznana usługa"}
                </div>
                <div className="text-xs font-bold bg-white/30 rounded px-1 py-0.5 backdrop-blur-sm whitespace-nowrap text-center min-w-[35px]">
                  {appointment.services?.price ? `${appointment.services.price}zł` : "- zł"}
                </div>
              </div>

              {/* Czas: start - koniec (bez sekund) */}
              <div className="text-xs font-medium bg-white/20 rounded px-1.5 py-0.5 backdrop-blur-sm text-center">
                {appointment.appointment_time.slice(0, 5)} - {(() => {
                  const startTime = new Date(`2000-01-01T${appointment.appointment_time}`);
                  const duration = appointment.duration ?? appointment.services?.duration ?? 30;
                  const endTime = new Date(startTime.getTime() + duration * 60000);
                  return endTime.toTimeString().slice(0, 5);
                })()}
              </div>

              {/* Klient i telefon */}
              <div className="space-y-0.5 min-h-[20px]">
                <div className="text-xs opacity-95 truncate font-medium leading-tight">
                  {getClientName(appointment)}
                </div>
                {((appointment.is_guest && appointment.guest_phone) || 
                  (!appointment.is_guest && appointment.profiles?.phone)) && (
                  <div className="text-xs opacity-80 truncate leading-tight">
                    📞 {appointment.is_guest ? appointment.guest_phone : appointment.profiles?.phone}
                  </div>
                )}
              </div>

              {/* Footer: Status i bon */}
              <div className="flex justify-between items-center mt-auto gap-1 min-h-[18px]">
                <span className="text-xs bg-black/20 rounded px-1 py-0.5 font-medium truncate flex-shrink-0">
                  {appointment.status === 'confirmed' ? 'OK' :
                   appointment.status === 'cancelled' ? 'X' :
                   appointment.status === 'pending' ? '?' :
                   appointment.status === 'completed' ? '✓' : appointment.status}
                </span>
                {appointment.voucher_info && appointment.voucher_info.is_voucher ? (
                  <span className="text-xs bg-green-400/80 text-green-900 rounded px-1 py-0.5 font-medium flex-shrink-0">
                    BON
                  </span>
                ) : appointment.voucher_code && (
                  <span className="text-xs bg-yellow-400/80 text-yellow-900 rounded px-1 py-0.5 font-medium flex-shrink-0">
                    BON
                  </span>
                )}
              </div>
            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
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
              <div className="w-4 h-4 rounded-full bg-gray-300/50 border border-gray-400"></div>
              <span className="text-sm text-gray-600 font-medium">Niedostępny w grafiku</span>
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

      <AppointmentDetailsDialog
        appointment={selectedAppointment}
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};

export default TherapistCalendar;