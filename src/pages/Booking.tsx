import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, User, CheckCircle, ArrowLeft, Gift } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  const [voucherCode, setVoucherCode] = useState<string>("");
  const [voucherData, setVoucherData] = useState<any>(null);
  const [voucherError, setVoucherError] = useState<string>("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  // Generowanie godzin co 30 minut
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 18 && minute > 0) break; // Kończymy o 18:00
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

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

  // Refetch therapists when selected service changes
  useEffect(() => {
    fetchTherapists();
  }, [selectedService]);

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
      let query = supabase
        .from("therapists")
        .select("*")
        .eq("is_active", true)
        .order("name");
      
      // Jeśli wybrano usługę, pobierz tylko terapeutów którzy mogą ją wykonywać
      if (selectedService) {
        const { data: therapistServices } = await supabase
          .from("therapist_services")
          .select("therapist_id")
          .eq("service_id", selectedService.id);
        
        if (therapistServices && therapistServices.length > 0) {
          const therapistIds = therapistServices.map(ts => ts.therapist_id);
          query = query.in("id", therapistIds);
        } else {
          // Jeśli usługa nie ma przypisanych terapeutów, nie pokazuj żadnych
          setTherapists([]);
          return;
        }
      }
      
      const { data, error } = await query;
      
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
    
    for (let i = 0; i <= 14; i++) {
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
      console.log("Checking availability for:", { date, therapistId });
      
      const { data: bookedAppointments, error } = await supabase
        .from("appointments")
        .select(`
          appointment_time,
          services (
            duration
          )
        `)
        .eq("therapist_id", therapistId)
        .eq("appointment_date", date)
        .in("status", ["confirmed", "pending"]); // Nie blokuj anulowanych wizyt

      if (error) throw error;

      console.log("Booked appointments:", bookedAppointments);

      // Jeśli brak wybranej usługi, nie blokuj niczego
      if (!selectedService) {
        setAvailableTimes(timeSlots);
        return;
      }

      const selectedServiceDuration = selectedService.duration;
      const blockedTimes = new Set<string>();

      // Dla każdego slotu czasowego sprawdź czy można zarezerwować usługę
      timeSlots.forEach(slot => {
        const slotTimeMinutes = parseInt(slot.split(':')[0]) * 60 + parseInt(slot.split(':')[1]);
        const slotEndTimeMinutes = slotTimeMinutes + selectedServiceDuration;
        
        let isSlotAvailable = true;

        // Sprawdź konflikt z każdą istniejącą wizytą
        bookedAppointments?.forEach(apt => {
          const appointmentTime = apt.appointment_time.slice(0, 5);
          const appointmentTimeMinutes = parseInt(appointmentTime.split(':')[0]) * 60 + parseInt(appointmentTime.split(':')[1]);
          const appointmentEndTimeMinutes = appointmentTimeMinutes + (apt.services?.duration || 60);

          // Sprawdź czy nowa wizyta koliduje z istniejącą
          // Kolizja występuje gdy:
          // 1. Nowa wizyta zaczyna się w trakcie istniejącej wizyty
          // 2. Nowa wizyta kończy się w trakcie istniejącej wizyty  
          // 3. Nowa wizyta całkowicie zawiera istniejącą wizytę
          // 4. Istniejąca wizyta całkowicie zawiera nową wizytę
          
          const newStartsBeforeExistingEnds = slotTimeMinutes < appointmentEndTimeMinutes;
          const newEndsAfterExistingStarts = slotEndTimeMinutes > appointmentTimeMinutes;
          
          if (newStartsBeforeExistingEnds && newEndsAfterExistingStarts) {
            isSlotAvailable = false;
          }
        });

        // Sprawdź też czy wizyta nie wykracza poza godziny pracy (18:00)
        const endHour = Math.floor(slotEndTimeMinutes / 60);
        const endMinute = slotEndTimeMinutes % 60;
        if (endHour > 18 || (endHour === 18 && endMinute > 0)) {
          isSlotAvailable = false;
        }

        if (!isSlotAvailable) {
          blockedTimes.add(slot);
        }
      });
      
      console.log("Blocked times with duration:", Array.from(blockedTimes));
      
      const available = timeSlots.filter(time => !blockedTimes.has(time));
      
      console.log("Available times:", available);
      setAvailableTimes(available);
    } catch (error: any) {
      console.error("Error checking availability:", error);
      setAvailableTimes(timeSlots);
    }
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    // Reset selected therapist when service changes
    setSelectedTherapist(null);
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

  const verifyVoucher = async () => {
    if (!voucherCode.trim()) {
      setVoucherError("Wprowadź kod bonu");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select(`
          *,
          services(id, name, price)
        `)
        .eq('code', voucherCode.toUpperCase())
        .eq('status', 'active')
        .maybeSingle();

      if (error || !data) {
        setVoucherError("Nieprawidłowy kod bonu lub bon nieaktywny");
        setVoucherData(null);
        return;
      }

      // Check if voucher is expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setVoucherError("Bon wygasł");
        setVoucherData(null);
        return;
      }

      // Check if voucher has remaining value/sessions
      if (data.voucher_type === 'single' && data.remaining_value <= 0) {
        setVoucherError("Bon został już wykorzystany");
        setVoucherData(null);
        return;
      }

      if (data.voucher_type === 'package' && data.remaining_sessions <= 0) {
        setVoucherError("Wszystkie sesje z pakietu zostały wykorzystane");
        setVoucherData(null);
        return;
      }

      // Check if voucher is valid for selected service
      if (data.service_id && selectedService && data.service_id !== selectedService.id) {
        setVoucherError(`Ten bon jest ważny tylko dla określonej usługi`);
        setVoucherData(null);
        return;
      }

      // For guest vouchers (purchaser_email/phone), automatically assign to current user
      if (data.user_id === null && user && (data.purchaser_email || data.purchaser_phone)) {
        try {
          const { error: updateError } = await supabase
            .from('vouchers')
            .update({ user_id: user.id })
            .eq('id', data.id);

          if (updateError) {
            console.error('Error assigning voucher to user:', updateError);
          } else {
            // Update local data to reflect the assignment
            data.user_id = user.id;
          }
        } catch (assignError) {
          console.error('Error assigning voucher:', assignError);
        }
      }

      setVoucherData(data);
      setVoucherError("");
      toast({
        title: "Sukces",
        description: "Bon został pomyślnie zweryfikowany i przypisany do Twojego konta!",
      });
    } catch (error) {
      console.error('Error verifying voucher:', error);
      setVoucherError("Błąd podczas weryfikacji bonu");
      setVoucherData(null);
    }
  };

  const calculateFinalPrice = () => {
    if (!selectedService || !voucherData) return selectedService?.price || 0;

    if (voucherData.voucher_type === 'single') {
      const discount = Math.min(voucherData.remaining_value, selectedService.price);
      return Math.max(0, selectedService.price - discount);
    }

    // For package vouchers, the session is free if there are remaining sessions
    return voucherData.remaining_sessions > 0 ? 0 : selectedService?.price || 0;
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
      // Check if time slot is still available
      const { data: existingAppointment } = await supabase
        .from("appointments")
        .select("id")
        .eq("therapist_id", selectedTherapist.id)
        .eq("appointment_date", selectedDate)
        .eq("appointment_time", selectedTime)
        .eq("status", "confirmed")
        .single();

      if (existingAppointment) {
        toast({
          title: "Błąd",
          description: "Ten termin już nie jest dostępny",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Prepare appointment data
      const appointmentData = {
        service_id: selectedService.id,
        therapist_id: selectedTherapist.id,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        status: "confirmed",
        notes: notes || null,
        user_id: user.id,
        is_guest: false,
        voucher_code: voucherData ? voucherData.code : null,
      };

      // Create the appointment
      const { data: appointment, error: insertError } = await supabase
        .from("appointments")
        .insert(appointmentData)
        .select(`
          *,
          services(name, duration, price),
          therapists(name)
        `)
        .single();

      if (insertError) {
        throw insertError;
      }

      // Process voucher redemption if voucher was used
      if (voucherData && appointment) {
        const servicePrice = selectedService.price;
        
        const { data: voucherResult, error: voucherError } = await supabase
          .rpc('process_voucher_redemption', {
            p_voucher_code: voucherData.code,
            p_appointment_id: appointment.id,
            ...(servicePrice && { p_service_price: servicePrice })
          });

        if (voucherError) {
          console.error("Voucher redemption error:", voucherError);
          // Don't fail the appointment creation, just log the error
          toast({
            title: "Uwaga",
            description: "Wizyta została zarezerwowana, ale wystąpił problem z bonem. Skontaktuj się z recepcją.",
            variant: "destructive",
          });
        }
      }

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
                        <div className="text-right">
                          {voucherData ? (
                            <>
                              <div className="text-sm text-gray-500 line-through">
                                {selectedService?.price} zł
                              </div>
                              <div className="text-lg font-bold text-hanami-primary">
                                {calculateFinalPrice()} zł
                              </div>
                            </>
                          ) : (
                            <span className="text-lg font-bold text-hanami-primary">
                              {selectedService?.price} zł
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Voucher Section */}
                  <div className="bg-hanami-secondary/20 p-6 rounded-lg space-y-4">
                    <div className="flex items-center space-x-2">
                      <Gift className="h-5 w-5 text-hanami-primary" />
                      <h3 className="text-lg font-semibold text-hanami-primary">
                        Masz bon podarunkowy?
                      </h3>
                    </div>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Wprowadź kod bonu"
                        value={voucherCode}
                        onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      />
                      <Button variant="outline" onClick={verifyVoucher}>
                        Sprawdź
                      </Button>
                    </div>
                    {voucherError && (
                      <p className="text-red-500 text-sm">{voucherError}</p>
                    )}
                    {voucherData && (
                      <div className="bg-green-50 p-4 rounded border border-green-200">
                        <p className="text-green-700 font-medium">
                          ✓ Bon {voucherData.code} został zweryfikowany!
                        </p>
                        <p className="text-sm text-green-600">
                          {voucherData.voucher_type === 'single' 
                            ? `Rabat: ${Math.min(voucherData.remaining_value, selectedService?.price || 0)} zł`
                            : `Darmowa sesja z pakietu (pozostało: ${voucherData.remaining_sessions})`
                          }
                        </p>
                      </div>
                    )}
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