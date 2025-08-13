import { useState, useEffect } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Calendar, Clock, User, Phone, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePagination, usePaginatedData } from "@/hooks/usePagination";
import { PaginationControlsComponent } from "@/components/ui/pagination-controls";

interface Appointment {
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
}

interface TherapistAppointmentsProps {
  therapistId: string;
}

const TherapistAppointments = ({ therapistId }: TherapistAppointmentsProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const pagination = usePagination(appointments.length, 10);
  const paginatedAppointments = usePaginatedData(appointments, pagination);

  useEffect(() => {
    fetchAppointments();
  }, [therapistId]);

  const fetchAppointments = async () => {
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
        .gte("appointment_date", format(new Date(), "yyyy-MM-dd"))
        .order("appointment_date")
        .order("appointment_time");

      if (error) throw error;
      setAppointments(data || []);
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
      console.error("Error updating appointment status:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować statusu",
        variant: "destructive",
      });
    }
  };

  const deleteAppointment = async (appointmentId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć tę wizytę?")) {
      return;
    }

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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hanami-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-light">Nadchodzące wizyty</CardTitle>
        <CardDescription>
          Zarządzaj swoimi wizytami
        </CardDescription>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <p className="text-center text-hanami-neutral py-8">
            Brak nadchodzących wizyt
          </p>
        ) : (
          <>
            <div className="space-y-4">
              {paginatedAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="p-4 border border-hanami-neutral/20 rounded-lg"
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
                        <span>{appointment.is_guest ? appointment.guest_name : "Zarejestrowany klient"}</span>
                        {appointment.guest_phone && (
                          <>
                            <Phone className="h-4 w-4 text-hanami-neutral ml-4" />
                            <span>{appointment.guest_phone}</span>
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

                    <div className="flex flex-col items-end space-y-2">
                      <Badge className={getStatusColor(appointment.status)}>
                        {getStatusText(appointment.status)}
                      </Badge>

                      <div className="flex items-center space-x-2">
                        <Select
                          value={appointment.status}
                          onValueChange={(value) => updateAppointmentStatus(appointment.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="confirmed">Potwierdzona</SelectItem>
                            <SelectItem value="completed">Zakończona</SelectItem>
                            <SelectItem value="cancelled">Anulowana</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteAppointment(appointment.id)}
                          className="text-red-600 hover:text-red-700"
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
                  pageSizeOptions={[5, 10, 20, 50]}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TherapistAppointments;