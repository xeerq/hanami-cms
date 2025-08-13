import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Plus, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CreateAppointmentDialog from "./CreateAppointmentDialog";
import { usePagination, usePaginatedData } from "@/hooks/usePagination";
import { PaginationControlsComponent } from "@/components/ui/pagination-controls";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes?: string;
  services: { name: string; price: number; duration: number };
  therapists: { name: string };
  profiles: { first_name?: string; last_name?: string; phone?: string };
}

const AppointmentsManager = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();
  
  const pagination = usePagination(appointments.length, 15);
  const paginatedAppointments = usePaginatedData(appointments, pagination);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          services(name, price, duration),
          therapists(name)
        `)
        .order("appointment_date", { ascending: false })
        .order("appointment_time", { ascending: false });

      if (error) throw error;
      
      // Fetch user profiles separately
      const appointmentsWithProfiles = await Promise.all(
        (data || []).map(async (appointment) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, last_name, phone")
            .eq("user_id", appointment.user_id)
            .single();
          
          return {
            ...appointment,
            profiles: profile || { first_name: "", last_name: "", phone: "" }
          };
        })
      );
      
      setAppointments(appointmentsWithProfiles);
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

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", appointmentId);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Status wizyty został zaktualizowany",
      });

      fetchAppointments();
    } catch (error: any) {
      console.error("Error updating appointment:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować statusu",
        variant: "destructive",
      });
    }
  };

  const deleteAppointment = async (appointmentId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć tę wizytę?")) return;

    try {
      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", appointmentId);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Wizyta została usunięta",
      });

      fetchAppointments();
    } catch (error: any) {
      console.error("Error deleting appointment:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć wizyty",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "cancelled": return "bg-red-100 text-red-800";
      case "completed": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed": return "Potwierdzona";
      case "pending": return "Oczekująca";
      case "cancelled": return "Anulowana";
      case "completed": return "Zakończona";
      default: return status;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Zarządzanie wizytami</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hanami-primary mx-auto"></div>
            <p className="mt-2 text-hanami-neutral">Ładowanie wizyt...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-hanami-primary">Zarządzanie wizytami</CardTitle>
              <CardDescription>
                Przeglądaj, edytuj i zarządzaj wszystkimi wizytami
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Dodaj wizytę
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {appointments.length === 0 ? (
              <div className="text-center py-8 text-hanami-neutral">
                Brak wizyt do wyświetlenia
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {paginatedAppointments.map((appointment) => (
                    <div key={appointment.id} className="border border-hanami-accent/20 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-hanami-secondary rounded-full flex items-center justify-center">
                            <Calendar className="h-6 w-6 text-hanami-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-hanami-primary">
                              {appointment.services.name}
                            </h3>
                            <div className="flex items-center space-x-4 text-sm text-hanami-neutral">
                              <span className="flex items-center">
                                <User className="h-4 w-4 mr-1" />
                                {appointment.profiles.first_name} {appointment.profiles.last_name}
                              </span>
                              <span className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {new Date(appointment.appointment_date).toLocaleDateString('pl-PL')}
                              </span>
                              <span className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                {appointment.appointment_time}
                              </span>
                            </div>
                            <p className="text-sm text-hanami-neutral mt-1">
                              Terapeuta: {appointment.therapists.name}
                            </p>
                            <p className="text-sm text-hanami-neutral">
                              Cena: {appointment.services.price} zł • Czas: {appointment.services.duration} min
                            </p>
                            {appointment.notes && (
                              <p className="text-sm text-hanami-neutral mt-2">
                                <strong>Uwagi:</strong> {appointment.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(appointment.status)}>
                            {getStatusText(appointment.status)}
                          </Badge>
                          <div className="flex space-x-1">
                            <select
                              value={appointment.status}
                              onChange={(e) => updateAppointmentStatus(appointment.id, e.target.value)}
                              className="text-xs border border-hanami-accent/20 rounded px-2 py-1"
                            >
                              <option value="pending">Oczekująca</option>
                              <option value="confirmed">Potwierdzona</option>
                              <option value="completed">Zakończona</option>
                              <option value="cancelled">Anulowana</option>
                            </select>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteAppointment(appointment.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {appointments.length > 0 && (
                  <div className="border-t pt-4">
                    <PaginationControlsComponent
                      pagination={pagination}
                      totalItems={appointments.length}
                      pageSizeOptions={[10, 15, 25, 50]}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <CreateAppointmentDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchAppointments}
      />
    </>
  );
};

export default AppointmentsManager;