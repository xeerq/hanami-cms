import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface Therapist {
  id: string;
  name: string;
}

interface Profile {
  user_id: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

const CreateAppointmentDialog = ({ open, onOpenChange, onSuccess }: CreateAppointmentDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [formData, setFormData] = useState({
    user_id: "",
    service_id: "",
    therapist_id: "",
    appointment_date: "",
    appointment_time: "",
    notes: "",
    status: "confirmed"
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    try {
      const [servicesData, therapistsData, profilesData] = await Promise.all([
        supabase.from("services").select("id, name, duration, price").eq("is_active", true),
        supabase.from("therapists").select("id, name").eq("is_active", true),
        supabase.from("profiles").select("user_id, first_name, last_name, phone")
      ]);

      if (servicesData.error) throw servicesData.error;
      if (therapistsData.error) throw therapistsData.error;
      if (profilesData.error) throw profilesData.error;

      setServices(servicesData.data || []);
      setTherapists(therapistsData.data || []);
      setProfiles(profilesData.data || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować danych",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("appointments")
        .insert({
          user_id: formData.user_id,
          service_id: formData.service_id,
          therapist_id: formData.therapist_id,
          appointment_date: formData.appointment_date,
          appointment_time: formData.appointment_time,
          notes: formData.notes || null,
          status: formData.status
        });

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Wizyta została utworzona",
      });

      onSuccess();
      onOpenChange(false);
      setFormData({
        user_id: "",
        service_id: "",
        therapist_id: "",
        appointment_date: "",
        appointment_time: "",
        notes: "",
        status: "confirmed"
      });
    } catch (error: any) {
      console.error("Error creating appointment:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się utworzyć wizyty",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dodaj nową wizytę</DialogTitle>
          <DialogDescription>
            Utwórz wizytę dla klienta
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user_id">Klient</Label>
            <Select value={formData.user_id} onValueChange={(value) => setFormData({ ...formData, user_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz klienta" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((profile) => (
                  <SelectItem key={profile.user_id} value={profile.user_id}>
                    {profile.first_name} {profile.last_name} {profile.phone && `(${profile.phone})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="service_id">Usługa</Label>
            <Select value={formData.service_id} onValueChange={(value) => setFormData({ ...formData, service_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz usługę" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} - {service.price} zł ({service.duration} min)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="therapist_id">Terapeuta</Label>
            <Select value={formData.therapist_id} onValueChange={(value) => setFormData({ ...formData, therapist_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz terapeutę" />
              </SelectTrigger>
              <SelectContent>
                {therapists.map((therapist) => (
                  <SelectItem key={therapist.id} value={therapist.id}>
                    {therapist.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="appointment_date">Data</Label>
              <Input
                id="appointment_date"
                type="date"
                value={formData.appointment_date}
                onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="appointment_time">Godzina</Label>
              <Input
                id="appointment_time"
                type="time"
                value={formData.appointment_time}
                onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Oczekująca</SelectItem>
                <SelectItem value="confirmed">Potwierdzona</SelectItem>
                <SelectItem value="completed">Zakończona</SelectItem>
                <SelectItem value="cancelled">Anulowana</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Uwagi (opcjonalnie)</Label>
            <Textarea
              id="notes"
              placeholder="Dodatkowe informacje..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Tworzenie..." : "Utwórz wizytę"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAppointmentDialog;