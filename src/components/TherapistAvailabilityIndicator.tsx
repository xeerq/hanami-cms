import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface TherapistAvailabilityIndicatorProps {
  therapistId: string;
}

const TherapistAvailabilityIndicator = ({ therapistId }: TherapistAvailabilityIndicatorProps) => {
  const [availabilityInfo, setAvailabilityInfo] = useState<{
    status: 'available' | 'limited' | 'busy';
    message: string;
  }>({ status: 'available', message: 'Sprawdzanie...' });

  useEffect(() => {
    checkTherapistAvailability();
  }, [therapistId]);

  const checkTherapistAvailability = async () => {
    try {
      const today = new Date();
      const next7Days = [];
      
      // Generate next 7 days
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        if (date.getDay() !== 0) { // Skip Sundays
          next7Days.push(date.toISOString().split('T')[0]);
        }
      }

      let totalSlots = 0;
      let availableSlots = 0;

      // Check availability for each day
      for (const date of next7Days) {
        const dayOfWeek = new Date(date).getDay();
        
        // Check if therapist has schedule for this day
        const { data: schedules } = await supabase
          .from("therapist_schedules")
          .select("start_time, end_time")
          .eq("therapist_id", therapistId)
          .eq("day_of_week", dayOfWeek)
          .eq("status", "approved")
          .eq("is_active", true);

        if (schedules && schedules.length > 0) {
          // Count total time slots for this day (assuming 30min slots)
          for (const schedule of schedules) {
            const startHour = parseInt(schedule.start_time.split(':')[0]);
            const startMinute = parseInt(schedule.start_time.split(':')[1]);
            const endHour = parseInt(schedule.end_time.split(':')[0]);
            const endMinute = parseInt(schedule.end_time.split(':')[1]);
            
            const startTotalMinutes = startHour * 60 + startMinute;
            const endTotalMinutes = endHour * 60 + endMinute;
            const daySlots = (endTotalMinutes - startTotalMinutes) / 30;
            totalSlots += daySlots;
          }

          // Check existing appointments for this day
          const { data: appointments } = await supabase
            .from("appointments")
            .select("appointment_time, duration")
            .eq("therapist_id", therapistId)
            .eq("appointment_date", date)
            .not("status", "in", "('cancelled', 'rejected')");

          if (appointments) {
            availableSlots += totalSlots - appointments.length;
          } else {
            availableSlots += totalSlots;
          }
        }
      }

      // Determine status based on availability
      let status: 'available' | 'limited' | 'busy';
      let message: string;

      if (totalSlots === 0) {
        status = 'busy';
        message = 'Brak grafiku';
      } else {
        const availabilityRatio = availableSlots / totalSlots;
        
        if (availabilityRatio > 0.6) {
          status = 'available';
          message = 'Dobra dostępność';
        } else if (availabilityRatio > 0.2) {
          status = 'limited';
          message = 'Ograniczona dostępność';
        } else {
          status = 'busy';
          message = 'Mocno zajęty';
        }
      }

      setAvailabilityInfo({ status, message });
    } catch (error) {
      console.error('Error checking therapist availability:', error);
      setAvailabilityInfo({ status: 'available', message: 'Brak danych' });
    }
  };

  const getStatusColor = () => {
    switch (availabilityInfo.status) {
      case 'available':
        return 'bg-green-500';
      case 'limited':
        return 'bg-yellow-500';
      case 'busy':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getBadgeVariant = () => {
    switch (availabilityInfo.status) {
      case 'available':
        return 'secondary';
      case 'limited':
        return 'outline';
      case 'busy':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      <Badge variant={getBadgeVariant()} className="text-xs">
        <Clock className="w-3 h-3 mr-1" />
        {availabilityInfo.message}
      </Badge>
    </div>
  );
};

export default TherapistAvailabilityIndicator;