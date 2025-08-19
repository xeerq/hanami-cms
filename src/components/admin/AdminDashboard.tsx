import { useState, useEffect } from "react";
import { 
  Calendar, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Clock,
  Star,
  AlertCircle,
  Activity
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  todayAppointments: number;
  weeklyAppointments: number;
  monthlyRevenue: number;
  totalCustomers: number;
  popularService: string;
  occupancyRate: number;
  pendingAppointments: number;
  completedThisWeek: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    weeklyAppointments: 0,
    monthlyRevenue: 0,
    totalCustomers: 0,
    popularService: "-",
    occupancyRate: 0,
    pendingAppointments: 0,
    completedThisWeek: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      const today = new Date().toISOString().split('T')[0];
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStartStr = weekStart.toISOString().split('T')[0];
      
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStartStr = monthStart.toISOString().split('T')[0];

      // Parallel queries for better performance
      const [
        todayAppointmentsRes,
        weeklyAppointmentsRes,
        monthlyRevenueRes,
        customersRes,
        popularServiceRes,
        pendingRes,
        completedWeekRes
      ] = await Promise.all([
        // Today's appointments
        supabase
          .from("appointments")
          .select("*")
          .eq("appointment_date", today)
          .neq("status", "cancelled"),
        
        // Weekly appointments
        supabase
          .from("appointments")
          .select("*")
          .gte("appointment_date", weekStartStr)
          .neq("status", "cancelled"),
        
        // Monthly revenue (approximation based on services)
        supabase
          .from("appointments")
          .select(`
            services(price)
          `)
          .gte("appointment_date", monthStartStr)
          .eq("status", "completed"),
        
        // Total customers
        supabase
          .from("profiles")
          .select("id", { count: "exact" }),
        
        // Most popular service
        supabase
          .from("appointments")
          .select(`
            service_id,
            services(name)
          `)
          .gte("appointment_date", monthStartStr)
          .neq("status", "cancelled"),
        
        // Pending appointments
        supabase
          .from("appointments")
          .select("*")
          .eq("status", "confirmed")
          .gte("appointment_date", today),
        
        // Completed this week
        supabase
          .from("appointments")
          .select("*")
          .gte("appointment_date", weekStartStr)
          .eq("status", "completed")
      ]);

      // Process results
      const todayCount = todayAppointmentsRes.data?.length || 0;
      const weeklyCount = weeklyAppointmentsRes.data?.length || 0;
      
      // Calculate monthly revenue
      const monthlyRevenue = monthlyRevenueRes.data?.reduce((sum, appointment) => {
        return sum + (appointment.services?.price || 0);
      }, 0) || 0;
      
      const totalCustomers = customersRes.count || 0;
      
      // Find most popular service
      const serviceCounts: Record<string, number> = {};
      popularServiceRes.data?.forEach(appointment => {
        const serviceName = appointment.services?.name || "Unknown";
        serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + 1;
      });
      
      const popularService = Object.keys(serviceCounts).reduce(
        (a, b) => serviceCounts[a] > serviceCounts[b] ? a : b,
        "-"
      );
      
      const pendingCount = pendingRes.data?.length || 0;
      const completedWeek = completedWeekRes.data?.length || 0;
      
      // Calculate occupancy rate (simplified)
      const workingDaysThisWeek = 6; // Assuming 6 working days
      const slotsPerDay = 10; // Assuming 10 slots per day
      const totalAvailableSlots = workingDaysThisWeek * slotsPerDay;
      const occupancyRate = totalAvailableSlots > 0 ? (weeklyCount / totalAvailableSlots) * 100 : 0;

      setStats({
        todayAppointments: todayCount,
        weeklyAppointments: weeklyCount,
        monthlyRevenue: monthlyRevenue,
        totalCustomers: totalCustomers,
        popularService: popularService,
        occupancyRate: Math.round(occupancyRate),
        pendingAppointments: pendingCount,
        completedThisWeek: completedWeek,
      });
      
    } catch (error: any) {
      console.error("Error fetching dashboard stats:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować statystyk",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Przegląd najważniejszych statystyk Twojego spa
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Wizyty dzisiaj",
      value: stats.todayAppointments.toString(),
      description: "zaplanowanych wizyt",
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Wizyty w tym tygodniu",
      value: stats.weeklyAppointments.toString(),
      description: "łącznie wizyt",
      icon: Activity,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Przychód miesięczny",
      value: `${stats.monthlyRevenue.toLocaleString()} zł`,
      description: "z ukończonych wizyt",
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Łączna liczba klientów",
      value: stats.totalCustomers.toString(),
      description: "zarejestrowanych",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Najpopularniejsza usługa",
      value: stats.popularService,
      description: "w tym miesiącu",
      icon: Star,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      title: "Stopień obłożenia",
      value: `${stats.occupancyRate}%`,
      description: "w tym tygodniu",
      icon: TrendingUp,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: "Oczekujące wizyty",
      value: stats.pendingAppointments.toString(),
      description: "do potwierdzenia",
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Ukończone w tym tygodniu",
      value: stats.completedThisWeek.toString(),
      description: "zrealizowanych wizyt",
      icon: AlertCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Przegląd najważniejszych statystyk Twojego spa
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="shadow-soft hover:shadow-elegant transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg">Szybkie akcje</CardTitle>
            <CardDescription>
              Najczęściej używane funkcje
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="font-medium">Dodaj nową wizytę</span>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors">
              <Users className="h-5 w-5 text-primary" />
              <span className="font-medium">Zarządzaj terapeutami</span>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="font-medium">Utwórz bon prezentowy</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg">Status systemu</CardTitle>
            <CardDescription>
              Aktualne informacje o działaniu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Status bazy danych</span>
              <span className="text-sm text-green-600 font-medium">Aktywna</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Ostatnia synchronizacja</span>
              <span className="text-sm text-muted-foreground">
                {new Date().toLocaleTimeString('pl-PL')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Aktywni użytkownicy</span>
              <span className="text-sm text-primary font-medium">
                {stats.todayAppointments} dzisiaj
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}