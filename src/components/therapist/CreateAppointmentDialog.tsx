import React, { useState } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { CalendarIcon, Clock, User, Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  therapistId: string;
}

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface Profile {
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
}

const CreateAppointmentDialog = ({
  open,
  onOpenChange,
  onSuccess,
  therapistId,
}: CreateAppointmentDialogProps) => {
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [isGuest, setIsGuest] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const { toast } = useToast();

  // Bardziej elastyczne godziny - co 15 minut
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        if (hour === 18 && minute > 0) break; // Kończymy o 18:00
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Load services and profiles when dialog opens
  React.useEffect(() => {
    if (open) {
      loadInitialData();
    }
  }, [open]);

  const loadInitialData = async () => {
    setLoadingData(true);
    try {
      // Load services
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("id, name, duration, price")
        .eq("is_active", true);

      if (servicesError) throw servicesError;
      setServices(servicesData || []);

      // Load profiles for registered users
      if (!isGuest) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name, phone");

        if (profilesError) throw profilesError;
        setProfiles(profilesData || []);
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować danych",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date || !time || !serviceId) {
      toast({
        title: "Błąd",
        description: "Wypełnij wszystkie wymagane pola",
        variant: "destructive",
      });
      return;
    }

    if (isGuest && (!guestName || !guestPhone)) {
      toast({
        title: "Błąd",
        description: "Dla gościa wymagane są imię i numer telefonu",
        variant: "destructive",
      });
      return;
    }

    if (!isGuest && !selectedUserId) {
      toast({
        title: "Błąd",
        description: "Wybierz zarejestrowanego użytkownika",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const appointmentData = {
        therapist_id: therapistId,
        service_id: serviceId,
        appointment_date: format(date, "yyyy-MM-dd"),
        appointment_time: time + ":00", // Dodaj sekundy
        notes: notes || null,
        status: "confirmed",
        is_guest: isGuest,
        ...(isGuest 
          ? { 
              guest_name: guestName,
              guest_phone: guestPhone,
              user_id: null
            }
          : { 
              user_id: selectedUserId,
              guest_name: null,
              guest_phone: null
            }
        ),
      };

      console.log("Creating appointment with data:", appointmentData);

      const { error } = await supabase
        .from("appointments")
        .insert(appointmentData);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Wizyta została dodana",
      });

      // Reset form
      setDate(undefined);
      setTime("");
      setServiceId("");
      setSelectedUserId("");
      setGuestName("");
      setGuestPhone("");
      setNotes("");
      setIsGuest(false);
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating appointment:", error);
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się dodać wizyty",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Dodaj nową wizytę</DialogTitle>
          <DialogDescription>
            Utwórz wizytę dla zarejestrowanego użytkownika lub gościa
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Guest/Registered User Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="guest-mode"
              checked={isGuest}
              onCheckedChange={setIsGuest}
            />
            <Label htmlFor="guest-mode">Wizyta dla gościa (bez rejestracji)</Label>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Data wizyty</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: pl }) : "Wybierz datę"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <Label>Godzina</Label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz godzinę" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {timeSlots.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {slot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service Selection */}
          <div className="space-y-2">
            <Label>Usługa</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz usługę" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} ({service.duration}min - {service.price}zł)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client Selection */}
          {isGuest ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Imię i nazwisko gościa</Label>
                <Input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Jan Kowalski"
                />
              </div>
              <div className="space-y-2">
                <Label>Numer telefonu</Label>
                <Input
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="+48 123 456 789"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Zarejestrowany użytkownik</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz klienta" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      {profile.first_name} {profile.last_name}
                      {profile.phone && ` (${profile.phone})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notatki (opcjonalne)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Dodatkowe informacje o wizycie..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={loading || loadingData}>
              {loading ? "Dodawanie..." : "Dodaj wizytę"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAppointmentDialog;