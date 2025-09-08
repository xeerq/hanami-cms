import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DateAvailabilityIndicatorProps {
  date: string;
  therapistId: string;
  serviceDuration: number;
}

const DateAvailabilityIndicator = ({ date, therapistId, serviceDuration }: DateAvailabilityIndicatorProps) => {
  const [availabilityStatus, setAvailabilityStatus] = useState<{
    status: 'available' | 'limited' | 'busy' | 'no-schedule';
    availableSlots: number;
    totalSlots: number;
    message: string;
  }>({ status: 'available', availableSlots: 0, totalSlots: 0, message: 'Sprawdzanie...' });

  useEffect(() => {
    checkDateAvailability();
  }, [date, therapistId, serviceDuration]);

  const checkDateAvailability = async () => {
    try {
      const dayOfWeek = new Date(date).getDay();
      
      // Check if therapist has schedule for this day
      const { data: schedules } = await supabase
        .from("therapist_schedules")
        .select("start_time, end_time")
        .eq("therapist_id", therapistId)
        .eq("day_of_week", dayOfWeek)
        .eq("status", "approved")
        .eq("is_active", true);

      if (!schedules || schedules.length === 0) {
        setAvailabilityStatus({
          status: 'no-schedule',
          availableSlots: 0,
          totalSlots: 0,
          message: 'Brak grafiku'
        });
        return;
      }

      // Generate time slots based on therapist's schedule
      let totalSlots = 0;
      const timeSlots: string[] = [];
      
      for (const schedule of schedules) {
        const startHour = parseInt(schedule.start_time.split(':')[0]);
        const startMinute = parseInt(schedule.start_time.split(':')[1]);
        const endHour = parseInt(schedule.end_time.split(':')[0]);
        const endMinute = parseInt(schedule.end_time.split(':')[1]);
        
        // Generate 30-minute slots
        for (let hour = startHour; hour < endHour || (hour === endHour && startMinute === 0); hour++) {
          for (let minute = (hour === startHour ? startMinute : 0); minute < 60; minute += 30) {
            if (hour === endHour && minute >= endMinute) break;
            
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            
            // Check if service fits within working hours
            const slotEndMinutes = (hour * 60 + minute) + serviceDuration;
            const slotEndHour = Math.floor(slotEndMinutes / 60);
            const slotEndMinute = slotEndMinutes % 60;
            
            if (slotEndHour < endHour || (slotEndHour === endHour && slotEndMinute <= endMinute)) {
              timeSlots.push(timeString);
              totalSlots++;
            }
          }
        }
      }

      // Check existing appointments
      const { data: appointments } = await supabase
        .from("appointments")
        .select("appointment_time, duration")
        .eq("therapist_id", therapistId)
        .eq("appointment_date", date)
        .not("status", "in", "('cancelled', 'rejected')");

      // Check blocked slots
      const { data: blockedSlots } = await supabase
        .from("blocked_slots")
        .select("start_time, end_time")
        .eq("therapist_id", therapistId)
        .eq("blocked_date", date);

      // Filter out occupied slots
      let availableSlots = totalSlots;
      
      if (appointments) {
        availableSlots -= appointments.length;
      }

      // Remove blocked time slots
      if (blockedSlots) {
        for (const blocked of blockedSlots) {
          const blockedStart = blocked.start_time;
          const blockedEnd = blocked.end_time;
          
          // Count how many slots are blocked
          const blockedCount = timeSlots.filter(slot => {
            return slot >= blockedStart && slot < blockedEnd;
          }).length;
          
          availableSlots -= blockedCount;
        }
      }

      availableSlots = Math.max(0, availableSlots);

      // Determine status
      let status: 'available' | 'limited' | 'busy' | 'no-schedule';
      let message: string;

      if (totalSlots === 0) {
        status = 'no-schedule';
        message = 'Brak grafiku';
      } else if (availableSlots === 0) {
        status = 'busy';
        message = 'Brak wolnych terminów';
      } else if (availableSlots / totalSlots > 0.5) {
        status = 'available';
        message = `${availableSlots} wolnych terminów`;
      } else {
        status = 'limited';
        message = `${availableSlots} wolnych terminów`;
      }

      setAvailabilityStatus({
        status,
        availableSlots,
        totalSlots,
        message
      });
    } catch (error) {
      console.error('Error checking date availability:', error);
      setAvailabilityStatus({
        status: 'available',
        availableSlots: 0,
        totalSlots: 0,
        message: 'Błąd sprawdzania'
      });
    }
  };

  const getIndicatorColor = () => {
    switch (availabilityStatus.status) {
      case 'available':
        return 'bg-green-500';
      case 'limited':
        return 'bg-yellow-500';
      case 'busy':
      case 'no-schedule':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getIndicatorColor()} border-2 border-white`} />
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{availabilityStatus.message}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default DateAvailabilityIndicator;