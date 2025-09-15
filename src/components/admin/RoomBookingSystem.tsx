import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RoomBooking {
  id: string;
  room_id: string;
  appointment_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  rooms: {
    name: string;
  };
  appointments: {
    id: string;
    user_id: string;
    guest_name?: string;
    is_guest: boolean;
    services: {
      name: string;
    };
    therapists: {
      name: string;
    };
  };
}

interface Room {
  id: string;
  name: string;
  capacity: number;
  is_active: boolean;
}

export const RoomBookingSystem = () => {
  const [bookings, setBookings] = useState<RoomBooking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([fetchBookings(), fetchRooms()]);
  }, [selectedDate]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("room_bookings")
        .select(`
          *,
          rooms!room_bookings_room_id_fkey (name),
          appointments!room_bookings_appointment_id_fkey (
            id,
            user_id,
            guest_name,
            is_guest,
            services!appointments_service_id_fkey (name),
            therapists!appointments_therapist_id_fkey (name)
          )
        `)
        .eq("booking_date", selectedDate)
        .order("start_time");

      if (error) throw error;
      setBookings(data || []);
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać rezerwacji pomieszczeń",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setRooms(data || []);
    } catch (error: any) {
      console.error("Error fetching rooms:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-800">Potwierdzona</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Anulowana</Badge>;
      case "completed":
        return <Badge variant="outline">Zakończona</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRoomBookings = (roomId: string) => {
    return bookings.filter(booking => booking.room_id === roomId);
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5); // Format HH:MM
  };

  if (loading) {
    return <div className="flex justify-center p-8">Ładowanie...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">System rezerwacji pomieszczeń</h2>
          <p className="text-muted-foreground">
            Przegląd rezerwacji pomieszczeń na wybrany dzień
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
        </div>
      </div>

      <div className="grid gap-6">
        {rooms.map((room) => {
          const roomBookings = getRoomBookings(room.id);
          
          return (
            <Card key={room.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {room.name}
                </CardTitle>
                <CardDescription>
                  {roomBookings.length} rezerwacji na {selectedDate}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {roomBookings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>Brak rezerwacji w tym pomieszczeniu</p>
                    <p className="text-sm">Pomieszczenie jest dostępne przez cały dzień</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {roomBookings.map((booking) => (
                      <Card key={booking.id} className="border-l-4 border-l-primary">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                </span>
                                {getStatusBadge(booking.status)}
                              </div>
                              
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-2">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  <span>
                                    {booking.appointments?.is_guest 
                                      ? booking.appointments.guest_name 
                                      : "Klient zarejestrowany"}
                                  </span>
                                </div>
                                
                                <div className="text-muted-foreground">
                                  Usługa: {booking.appointments?.services?.name || "Nieznana"}
                                </div>
                                
                                <div className="text-muted-foreground">
                                  Terapeuta: {booking.appointments?.therapists?.name || "Nieznany"}
                                </div>
                                
                                {booking.notes && (
                                  <div className="text-muted-foreground">
                                    Uwagi: {booking.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {bookings.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
            <h3 className="text-lg font-medium mb-2">Brak rezerwacji</h3>
            <p className="text-muted-foreground">
              Nie ma żadnych rezerwacji pomieszczeń na {selectedDate}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};