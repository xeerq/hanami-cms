import { useState, useEffect } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Calendar, Clock, User, Phone, Search, Filter } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface HistoricalAppointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  user_id?: string;
  status: string;
  notes?: string;
  voucher_code?: string;
  guest_name?: string;
  guest_phone?: string;
  is_guest?: boolean;
  services: {
    name: string;
    duration: number;
    price: number;
  };
  profiles?: {
    first_name: string;
    last_name: string;
    phone?: string;
  };
}

interface TherapistHistoryProps {
  therapistId: string;
}

const TherapistHistory = ({ therapistId }: TherapistHistoryProps) => {
  const [appointments, setAppointments] = useState<HistoricalAppointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<HistoricalAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchHistoricalAppointments();
  }, [therapistId]);

  useEffect(() => {
    filterAppointments();
  }, [appointments, searchTerm, statusFilter]);

  const fetchHistoricalAppointments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          appointment_time,
          user_id,
          status,
          notes,
          voucher_code,
          guest_name,
          guest_phone,
          is_guest,
          services (
            name,
            duration,
            price
          )
        `)
        .eq("therapist_id", therapistId)
        .lt("appointment_date", format(new Date(), "yyyy-MM-dd"))
        .order("appointment_date", { ascending: false })
        .order("appointment_time", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately to avoid type issues
      const appointmentsWithProfiles = await Promise.all(
        (data || []).map(async (appointment) => {
          let updatedAppointment: any = { ...appointment };
          
          // Fetch profile if needed
          if (!appointment.is_guest && appointment.user_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("first_name, last_name, phone")
              .eq("user_id", appointment.user_id)
              .single();
            
            updatedAppointment.profiles = profile;
          }
          
          return updatedAppointment;
        })
      );

      setAppointments(appointmentsWithProfiles as HistoricalAppointment[]);
    } catch (error: any) {
      console.error("Error fetching historical appointments:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować historycznych wizyt",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAppointments = () => {
    let filtered = appointments;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(appointment => {
        const clientName = appointment.is_guest 
          ? appointment.guest_name || ""
          : `${appointment.profiles?.first_name || ""} ${appointment.profiles?.last_name || ""}`;
        const serviceName = appointment.services?.name || "";
        
        return (
          clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appointment.voucher_code?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(appointment => appointment.status === statusFilter);
    }

    setFilteredAppointments(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Potwierdzona";
      case "completed":
        return "Zakończona";
      case "cancelled":
        return "Anulowana";
      default:
        return status;
    }
  };

  const getClientName = (appointment: HistoricalAppointment) => {
    if (appointment.is_guest) {
      return appointment.guest_name || "Gość";
    }
    return appointment.profiles 
      ? `${appointment.profiles.first_name} ${appointment.profiles.last_name}`
      : "Nieznany klient";
  };

  const getTotalRevenue = () => {
    return filteredAppointments
      .filter(app => app.status === "completed")
      .reduce((sum, app) => sum + (app.services?.price || 0), 0);
  };

  const getCompletedCount = () => {
    return filteredAppointments.filter(app => app.status === "completed").length;
  };

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
      {/* Statistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-light text-hanami-neutral mb-1">
                {filteredAppointments.length}
              </div>
              <div className="text-sm text-hanami-neutral/70">
                Łączne wizyty
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-light text-hanami-neutral mb-1">
                {getCompletedCount()}
              </div>
              <div className="text-sm text-hanami-neutral/70">
                Ukończone wizyty
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-light text-hanami-neutral mb-1">
                {getTotalRevenue()} zł
              </div>
              <div className="text-sm text-hanami-neutral/70">
                Łączny przychód
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-light bg-gradient-to-r from-hanami-primary to-hanami-accent bg-clip-text text-transparent">
            Historia wizyt
          </CardTitle>
          <CardDescription>
            Przegląd wszystkich przeszłych wizyt
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Szukaj po kliencie, usłudze lub kodzie bonu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  <SelectItem value="completed">Ukończone</SelectItem>
                  <SelectItem value="cancelled">Anulowane</SelectItem>
                  <SelectItem value="confirmed">Potwierdzone</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredAppointments.length === 0 ? (
            <p className="text-center text-hanami-neutral py-8">
              {searchTerm || statusFilter !== "all" 
                ? "Brak wizyt spełniających kryteria wyszukiwania"
                : "Brak historycznych wizyt"
              }
            </p>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="p-4 border border-hanami-neutral/20 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="h-4 w-4 text-hanami-neutral" />
                        <span className="font-medium">
                          {format(new Date(appointment.appointment_date), "EEEE, d MMMM yyyy", { locale: pl })}
                        </span>
                        <Clock className="h-4 w-4 text-hanami-neutral ml-4" />
                        <span>{appointment.appointment_time.slice(0, 5)}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="h-4 w-4 text-hanami-neutral" />
                        <span>{getClientName(appointment)}</span>
                        {(appointment.guest_phone || appointment.profiles?.phone) && (
                          <>
                            <Phone className="h-4 w-4 text-hanami-neutral ml-4" />
                            <span>{appointment.guest_phone || appointment.profiles?.phone}</span>
                          </>
                        )}
                      </div>

                      <div className="text-sm text-hanami-neutral mb-2">
                        <strong>Usługa:</strong> {appointment.services?.name}
                      </div>

                      <div className="text-sm text-hanami-neutral mb-2">
                        <strong>Czas trwania:</strong> {appointment.services?.duration} min
                      </div>

                      <div className="text-sm text-hanami-neutral mb-2">
                        <strong>Cena:</strong> {appointment.services?.price} zł
                        {appointment.voucher_code && (
                          <span className="ml-2 text-green-600">(Bon: {appointment.voucher_code})</span>
                        )}
                      </div>

                      {appointment.notes && (
                        <div className="text-sm text-hanami-neutral">
                          <strong>Notatki:</strong> {appointment.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end">
                      <Badge className={getStatusColor(appointment.status)}>
                        {getStatusText(appointment.status)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TherapistHistory;