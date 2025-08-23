import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Users, Clock, DollarSign, TrendingUp, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ServiceStats {
  serviceName: string;
  appointmentCount: number;
  revenue: number;
  category: string;
  avgDuration: number;
}

interface DailyAppointments {
  date: string;
  count: number;
  revenue: number;
}

interface TherapistStats {
  name: string;
  appointmentCount: number;
  revenue: number;
  avgRating: number;
}

const ServiceSalesAnalytics = () => {
  const [serviceStats, setServiceStats] = useState<ServiceStats[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyAppointments[]>([]);
  const [therapistStats, setTherapistStats] = useState<TherapistStats[]>([]);
  const [timeRange, setTimeRange] = useState("30");
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const { toast } = useToast();

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

  useEffect(() => {
    fetchServiceAnalytics();
  }, [timeRange]);

  const fetchServiceAnalytics = async () => {
    try {
      setLoading(true);
      const daysAgo = parseInt(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Fetch completed appointments with services and therapists
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          duration,
          services (
            id,
            name,
            price,
            category
          ),
          therapists (
            id,
            name
          )
        `)
        .gte("appointment_date", startDateStr)
        .eq("status", "completed")
        .order("appointment_date", { ascending: false });

      if (appointmentsError) throw appointmentsError;

      // Process service statistics
      const serviceMap = new Map<string, ServiceStats>();
      const dailyMap = new Map<string, DailyAppointments>();
      const therapistMap = new Map<string, TherapistStats>();
      let totalRev = 0;
      let totalAppts = appointmentsData?.length || 0;

      appointmentsData?.forEach(appointment => {
        const service = appointment.services;
        const therapist = appointment.therapists;
        const revenue = Number(service?.price || 0);
        const appointmentDate = appointment.appointment_date;

        totalRev += revenue;

        // Service statistics
        if (service) {
          const serviceName = service.name;
          if (serviceMap.has(serviceName)) {
            const existing = serviceMap.get(serviceName)!;
            serviceMap.set(serviceName, {
              ...existing,
              appointmentCount: existing.appointmentCount + 1,
              revenue: existing.revenue + revenue,
              avgDuration: (existing.avgDuration + appointment.duration) / 2
            });
          } else {
            serviceMap.set(serviceName, {
              serviceName,
              appointmentCount: 1,
              revenue,
              category: service.category || 'Other',
              avgDuration: appointment.duration
            });
          }
        }

        // Daily statistics
        if (dailyMap.has(appointmentDate)) {
          const existing = dailyMap.get(appointmentDate)!;
          dailyMap.set(appointmentDate, {
            date: appointmentDate,
            count: existing.count + 1,
            revenue: existing.revenue + revenue
          });
        } else {
          dailyMap.set(appointmentDate, {
            date: appointmentDate,
            count: 1,
            revenue
          });
        }

        // Therapist statistics
        if (therapist) {
          const therapistName = therapist.name;
          if (therapistMap.has(therapistName)) {
            const existing = therapistMap.get(therapistName)!;
            therapistMap.set(therapistName, {
              ...existing,
              appointmentCount: existing.appointmentCount + 1,
              revenue: existing.revenue + revenue
            });
          } else {
            therapistMap.set(therapistName, {
              name: therapistName,
              appointmentCount: 1,
              revenue,
              avgRating: 4.5 // Placeholder - would need rating system
            });
          }
        }
      });

      const serviceArray = Array.from(serviceMap.values())
        .sort((a, b) => b.revenue - a.revenue);
      
      const dailyArray = Array.from(dailyMap.values())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const therapistArray = Array.from(therapistMap.values())
        .sort((a, b) => b.revenue - a.revenue);

      setServiceStats(serviceArray);
      setDailyStats(dailyArray);
      setTherapistStats(therapistArray);
      setTotalRevenue(totalRev);
      setTotalAppointments(totalAppts);

    } catch (error: any) {
      console.error("Error fetching service analytics:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować analityki usług",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Analityka usług
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Ładowanie danych usług...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Analityka usług spa
              </CardTitle>
              <CardDescription>
                Szczegółowe statystyki popularności i rentowności usług
              </CardDescription>
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Ostatnie 7 dni</SelectItem>
                <SelectItem value="30">Ostatnie 30 dni</SelectItem>
                <SelectItem value="90">Ostatnie 3 miesiące</SelectItem>
                <SelectItem value="365">Ostatni rok</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Key metrics for services */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Przychód z usług</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Ukończone wizyty</p>
                <p className="text-2xl font-bold">{totalAppointments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Średnia wartość wizyty</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalAppointments > 0 ? totalRevenue / totalAppointments : 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Aktywne usługi</p>
                <p className="text-2xl font-bold">{serviceStats.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily appointments chart */}
        <Card>
          <CardHeader>
            <CardTitle>Wizyty dzienne</CardTitle>
            <CardDescription>Liczba wizyt w czasie</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('pl-PL')}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString('pl-PL')}
                  formatter={(value, name) => [value, name === 'count' ? 'Wizyty' : 'Przychód']}
                />
                <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Service popularity pie chart */}
        <Card>
          <CardHeader>
            <CardTitle>Popularność usług</CardTitle>
            <CardDescription>Udział w łącznej liczbie wizyt</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={serviceStats.slice(0, 5)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ serviceName, appointmentCount }) => 
                    `${serviceName} (${appointmentCount})`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="appointmentCount"
                >
                  {serviceStats.slice(0, 5).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top services list */}
      <Card>
        <CardHeader>
          <CardTitle>Najpopularniejsze usługi</CardTitle>
          <CardDescription>Ranking według przychodu</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {serviceStats.slice(0, 5).map((service, index) => (
              <div key={service.serviceName} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                    <span className="text-sm font-bold text-primary">#{index + 1}</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">{service.serviceName}</h4>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {service.category}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {service.appointmentCount} wizyt • {Math.round(service.avgDuration)} min
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(service.revenue)}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(service.revenue / service.appointmentCount)} śr./wizyta
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Therapist performance */}
      <Card>
        <CardHeader>
          <CardTitle>Wydajność terapeutów</CardTitle>
          <CardDescription>Statystyki według przychodów</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {therapistStats.slice(0, 5).map((therapist, index) => (
              <div key={therapist.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                    <span className="text-sm font-bold text-primary">#{index + 1}</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">{therapist.name}</h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">
                        {therapist.appointmentCount} wizyt
                      </span>
                      <Badge variant="outline" className="text-xs">
                        ⭐ {therapist.avgRating.toFixed(1)}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(therapist.revenue)}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(therapist.revenue / therapist.appointmentCount)} śr./wizyta
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Service revenue comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Porównanie przychodów usług</CardTitle>
          <CardDescription>Przychód według typu usługi</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={serviceStats.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="serviceName" angle={-45} textAnchor="end" height={100} />
              <YAxis tickFormatter={(value) => `${value} zł`} />
              <Tooltip formatter={(value) => [`${value} zł`, 'Przychód']} />
              <Bar dataKey="revenue" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceSalesAnalytics;