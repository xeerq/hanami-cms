import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, User, CheckCircle, ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  description: string;
  category: string;
  is_active: boolean;
}

interface Therapist {
  id: string;
  name: string;
  specialization: string;
  experience: string;
  bio: string;
  is_active: boolean;
}

const Booking = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  const timeSlots = [
    "08:00", "09:00", "10:00", "11:00", "12:00", 
    "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
  ];

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      toast({
        title: "Wymagane logowanie",
        description: "Musisz być zalogowany, aby dokonać rezerwacji",
        variant: "destructive",
      });
      navigate("/auth");
    }
  }, [user, navigate, toast]);

  // Fetch services and therapists
  useEffect(() => {
    fetchServices();
    fetchTherapists();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      console.error("Error fetching services:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować usług",
        variant: "destructive",
      });
    }
  };

  const fetchTherapists = async () => {
    try {
      const { data, error } = await supabase
        .from("therapists")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setTherapists(data || []);
    } catch (error: any) {
      console.error("Error fetching therapists:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować terapeutów",
        variant: "destructive",
      });
    }
  };

  const generateAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Skip Sundays (0 = Sunday)
      if (date.getDay() !== 0) {
        dates.push(date.toISOString().split('T')[0]);
      }
    }
    
    return dates;
  };

  const checkAvailableTimes = async (date: string, therapistId: string) => {
    try {
      const { data: bookedAppointments, error } = await supabase
        .from("appointments")
        .select("appointment_time")
        .eq("therapist_id", therapistId)
        .eq("appointment_date", date)
        .eq("status", "confirmed");

      if (error) throw error;

      const bookedTimes = bookedAppointments?.map(apt => apt.appointment_time) || [];
      const available = timeSlots.filter(time => !bookedTimes.includes(time));
      
      setAvailableTimes(available);
    } catch (error: any) {
      console.error("Error checking availability:", error);
      setAvailableTimes(timeSlots);
    }
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setStep(2);
  };

  const handleTherapistSelect = (therapist: Therapist) => {
    setSelectedTherapist(therapist);
    setAvailableDates(generateAvailableDates());
    setStep(3);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    if (selectedTherapist) {
      checkAvailableTimes(date, selectedTherapist.id);
    }
    setStep(4);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep(5);
  };

  const handleConfirm = async () => {
    if (!user || !selectedService || !selectedTherapist || !selectedDate || !selectedTime) {
      toast({
        title: "Błąd",
        description: "Wszystkie pola muszą być wypełnione",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-booking', {
        body: {
          serviceId: selectedService.id,
          therapistId: selectedTherapist.id,
          appointmentDate: selectedDate,
          appointmentTime: selectedTime,
          notes: notes || null
        }
      });

      if (error) throw error;

      toast({
        title: "Sukces!",
        description: "Wizyta została zarezerwowana pomyślnie",
      });
      
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error creating booking:", error);
      toast({
        title: "Błąd rezerwacji",
        description: error.message || "Nie udało się zarezerwować wizyty",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-hanami text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-light mb-6">Rezerwacja wizyty</h1>
          <p className="text-xl max-w-3xl mx-auto text-white/90">
            Zarezerwuj swoją wizytę w kilku prostych krokach
          </p>
        </div>
      </section>

      {/* Booking Steps */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Progress Bar */}
          <div className="mb-12">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4, 5].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNumber 
                      ? "bg-hanami-primary text-white" 
                      : "bg-hanami-secondary text-hanami-neutral"
                  }`}>
                    {step > stepNumber ? <CheckCircle className="h-5 w-5" /> : stepNumber}
                  </div>
                  {stepNumber < 5 && (
                    <div className={`h-1 w-16 mx-2 ${
                      step > stepNumber ? "bg-hanami-primary" : "bg-hanami-secondary"
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step 1: Service Selection */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-hanami-primary">
                  Wybierz usługę
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {services.map((service) => (
                    <Card 
                      key={service.id}
                      className="cursor-pointer hover:shadow-elegant transition-zen border-hanami-accent/20 hover:border-hanami-primary"
                      onClick={() => handleServiceSelect(service)}
                    >
                      <CardContent className="p-6 text-center">
                        <h3 className="text-xl font-semibold text-hanami-primary mb-2">
                          {service.name}
                        </h3>
                        <p className="text-hanami-neutral text-sm mb-4">
                          {service.description}
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-center space-x-2 text-sm text-hanami-neutral">
                            <Clock className="h-4 w-4" />
                            <span>{service.duration} min</span>
                          </div>
                          <div className="text-2xl font-bold text-hanami-primary">
                            {service.price} zł
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Therapist Selection */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-hanami-primary">
                  Wybierz terapeutkę
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {therapists.map((therapist) => (
                    <Card 
                      key={therapist.id}
                      className="cursor-pointer hover:shadow-elegant transition-zen border-hanami-accent/20 hover:border-hanami-primary"
                      onClick={() => handleTherapistSelect(therapist)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-4 mb-4">
                          <div className="w-16 h-16 bg-hanami-secondary rounded-full flex items-center justify-center">
                            <User className="h-8 w-8 text-hanami-primary" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-hanami-primary">
                              {therapist.name}
                            </h3>
                            <p className="text-hanami-neutral text-sm">
                              {therapist.experience}
                            </p>
                          </div>
                        </div>
                        <p className="text-hanami-neutral mb-2">
                          <strong>Specjalizacja:</strong> {therapist.specialization}
                        </p>
                        {therapist.bio && (
                          <p className="text-hanami-neutral text-sm">
                            {therapist.bio}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="mt-6">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Wróć do wyboru usługi
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Date Selection */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-hanami-primary">
                  Wybierz datę
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-7 gap-4">
                  {availableDates.map((date) => {
                    const dateObj = new Date(date);
                    const dayName = dateObj.toLocaleDateString('pl-PL', { weekday: 'short' });
                    const dayNumber = dateObj.getDate();
                    const monthName = dateObj.toLocaleDateString('pl-PL', { month: 'short' });
                    
                    return (
                      <Button
                        key={date}
                        variant="outline"
                        className="p-4 h-auto flex flex-col hover:bg-hanami-primary hover:text-white"
                        onClick={() => handleDateSelect(date)}
                      >
                        <Calendar className="h-5 w-5 mb-2" />
                        <span className="text-xs font-medium">{dayName}</span>
                        <span className="text-lg font-bold">{dayNumber}</span>
                        <span className="text-xs">{monthName}</span>
                      </Button>
                    );
                  })}
                </div>
                <div className="mt-6">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Wróć do wyboru terapeutki
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Time Selection */}
          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-hanami-primary">
                  Wybierz godzinę
                </CardTitle>
                <p className="text-hanami-neutral">
                  Dostępne terminy na {new Date(selectedDate).toLocaleDateString('pl-PL')}
                </p>
              </CardHeader>
              <CardContent>
                {availableTimes.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-hanami-neutral">
                      Brak dostępnych terminów w tym dniu. Wybierz inną datę.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                    {availableTimes.map((time) => (
                      <Button
                        key={time}
                        variant="outline"
                        className="p-4 hover:bg-hanami-primary hover:text-white"
                        onClick={() => handleTimeSelect(time)}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        {time}
                      </Button>
                    ))}
                  </div>
                )}
                <div className="mt-6">
                  <Button variant="outline" onClick={() => setStep(3)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Wróć do wyboru daty
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Confirmation */}
          {step === 5 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-hanami-primary">
                  Potwierdzenie rezerwacji
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="bg-hanami-cream p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-hanami-primary mb-4">
                      Szczegóły rezerwacji
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-hanami-neutral">Usługa:</span>
                        <span className="font-medium">{selectedService?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-hanami-neutral">Terapeutka:</span>
                        <span className="font-medium">{selectedTherapist?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-hanami-neutral">Data:</span>
                        <span className="font-medium">
                          {new Date(selectedDate).toLocaleDateString('pl-PL', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-hanami-neutral">Godzina:</span>
                        <span className="font-medium">{selectedTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-hanami-neutral">Czas trwania:</span>
                        <span className="font-medium">{selectedService?.duration} min</span>
                      </div>
                      <div className="flex justify-between border-t pt-3">
                        <span className="text-lg font-semibold">Cena:</span>
                        <span className="text-lg font-bold text-hanami-primary">
                          {selectedService?.price} zł
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Uwagi do wizyty (opcjonalnie)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Dodatkowe informacje, preferencje, itp."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex space-x-4">
                    <Button variant="outline" onClick={() => setStep(4)}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Wróć do wyboru godziny
                    </Button>
                    <Button 
                      onClick={handleConfirm} 
                      className="flex-1"
                      disabled={loading}
                    >
                      {loading ? "Rezerwowanie..." : "Potwierdź rezerwację"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Booking;