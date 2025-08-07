import React, { useState, useEffect } from "react";
import { format, isToday, isTomorrow, startOfDay, endOfDay } from "date-fns";
import { pl } from "date-fns/locale";
import { Calendar, Clock, CheckCircle, Star, Users, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TherapistDashboardProps {
  therapistId: string;
  therapistName: string;
}

interface DashboardStats {
  todayAppointments: number;
  upcomingAppointments: number;
  completedAppointments: number;
  averageRating: number;
  totalClients: number;
  thisWeekRevenue: number;
}

const TherapistDashboard = ({ therapistId, therapistName }: TherapistDashboardProps) => {
  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    upcomingAppointments: 0,
    completedAppointments: 0,
    averageRating: 4.9,
    totalClients: 0,
    thisWeekRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardStats();
  }, [therapistId]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const today = new Date();
      const todayStr = format(today, "yyyy-MM-dd");
      
      // Fetch today's appointments
      const { data: todayData, error: todayError } = await supabase
        .from("appointments")
        .select("id, status")
        .eq("therapist_id", therapistId)
        .eq("appointment_date", todayStr);

      if (todayError) throw todayError;

      // Fetch upcoming appointments (future dates)
      const { data: upcomingData, error: upcomingError } = await supabase
        .from("appointments")
        .select("id, status")
        .eq("therapist_id", therapistId)
        .gt("appointment_date", todayStr)
        .in("status", ["confirmed", "pending"]);

      if (upcomingError) throw upcomingError;

      // Fetch completed appointments (all time)
      const { data: completedData, error: completedError } = await supabase
        .from("appointments")
        .select("id")
        .eq("therapist_id", therapistId)
        .eq("status", "completed");

      if (completedError) throw completedError;

      // Fetch unique clients count
      const { data: clientsData, error: clientsError } = await supabase
        .from("appointments")
        .select("user_id, guest_name, guest_phone")
        .eq("therapist_id", therapistId)
        .not("status", "eq", "cancelled");

      if (clientsError) throw clientsError;

      // Count unique clients
      const uniqueClients = new Set();
      clientsData?.forEach(appointment => {
        if (appointment.user_id) {
          uniqueClients.add(appointment.user_id);
        } else if (appointment.guest_name && appointment.guest_phone) {
          uniqueClients.add(`${appointment.guest_name}-${appointment.guest_phone}`);
        }
      });

      // Calculate this week's revenue
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

      const { data: revenueData, error: revenueError } = await supabase
        .from("appointments")
        .select(`
          services (price)
        `)
        .eq("therapist_id", therapistId)
        .eq("status", "completed")
        .gte("appointment_date", format(startOfWeek, "yyyy-MM-dd"))
        .lte("appointment_date", format(endOfWeek, "yyyy-MM-dd"));

      if (revenueError) throw revenueError;

      const weekRevenue = revenueData?.reduce((sum, appointment) => {
        return sum + (appointment.services?.price || 0);
      }, 0) || 0;

      setStats({
        todayAppointments: todayData?.filter(app => app.status !== "cancelled").length || 0,
        upcomingAppointments: upcomingData?.length || 0,
        completedAppointments: completedData?.length || 0,
        averageRating: 4.9, // Placeholder - would need rating system
        totalClients: uniqueClients.size,
        thisWeekRevenue: weekRevenue
      });

    } catch (error: any) {
      console.error("Error fetching dashboard stats:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować statystyk dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-0 shadow-lg bg-white/95 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-light text-hanami-neutral mb-2">
          Zarządzaj swoim harmonogramem i klientami
        </h2>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Today's Appointments */}
        <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-hanami-neutral/70 mb-1">
                  Wizyty dzisiaj
                </p>
                <p className="text-3xl font-light text-hanami-neutral">
                  {stats.todayAppointments}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-hanami-neutral/70 mb-1">
                  Nadchodzące
                </p>
                <p className="text-3xl font-light text-hanami-neutral">
                  {stats.upcomingAppointments}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Completed Appointments */}
        <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-hanami-neutral/70 mb-1">
                  Ukończone
                </p>
                <p className="text-3xl font-light text-hanami-neutral">
                  {stats.completedAppointments}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Rating */}
        <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-hanami-neutral/70 mb-1">
                  Średnia ocena
                </p>
                <p className="text-3xl font-light text-hanami-neutral">
                  {stats.averageRating}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center group-hover:bg-pink-200 transition-colors">
                <Star className="h-6 w-6 text-pink-600 fill-current" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Clients */}
        <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium text-hanami-neutral flex items-center">
              <Users className="h-5 w-5 mr-2 text-hanami-primary" />
              Klienci
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-light text-hanami-neutral mb-1">
              {stats.totalClients}
            </div>
            <p className="text-sm text-hanami-neutral/70">
              Łączna liczba obsłużonych klientów
            </p>
          </CardContent>
        </Card>

        {/* This Week Revenue */}
        <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium text-hanami-neutral flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-hanami-primary" />
              Przychód tego tygodnia
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-light text-hanami-neutral mb-1">
              {stats.thisWeekRevenue.toFixed(0)} zł
            </div>
            <p className="text-sm text-hanami-neutral/70">
              Przychód z ukończonych wizyt
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TherapistDashboard;