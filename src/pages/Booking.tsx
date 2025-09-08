import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface Category {
  id: string;
  name: string;
  description: string;
  type: string;
  is_active: boolean;
}

interface Therapist {
  id: string;
  name: string;
  specialization: string;
  experience: string;
  bio: string;
  is_active: boolean;
  avatar_url?: string;
}

const Booking = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Wszystkie");
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

  // Get filtered services based on category
  const filteredServices = selectedCategory === "Wszystkie" 
    ? services 
    : services.filter(service => service.category === selectedCategory);
  
  // Create categories list with "Wszystkie" option
  const categoriesList = ["Wszystkie", ...categories.map(cat => cat.name)];

  // Get available therapists for selected service
  const availableTherapists = therapists.filter(therapist => {
    if (!selectedService) return true;
    // If service requires specific therapists, filter them here
    return true; // For now, show all active therapists
  });

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

  // Fetch categories, services and therapists
  useEffect(() => {
    fetchCategories();
    fetchServices();
    fetchTherapists();
  }, []);

  // Refetch therapists when selected service changes
  useEffect(() => {
    fetchTherapists();
  }, [selectedService]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("type", "service")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować kategorii",
        variant: "destructive",
      });
    }
  };

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
      
      // Jeśli brak wybranej usługi, nie blokuj niczego
      if (!selectedService) {
        setAvailableTimes(timeSlots);
        return;
      }

      setLoading(true);
      const selectedServiceDuration = selectedService.duration;

      // Sprawdź każdy slot czasowy czy jest dostępny według grafiku terapeuty i istniejących wizyt
      const availabilityChecks = timeSlots.map(async (slot) => {
        try {
          // Sprawdź czy wizyta nie wykracza poza godziny pracy (18:00)
          const slotTimeMinutes = parseInt(slot.split(':')[0]) * 60 + parseInt(slot.split(':')[1]);
          const slotEndTimeMinutes = slotTimeMinutes + selectedServiceDuration;
          const endHour = Math.floor(slotEndTimeMinutes / 60);
          const endMinute = slotEndTimeMinutes % 60;
          
          if (endHour > 18 || (endHour === 18 && endMinute > 0)) {
            return { slot, available: false, reason: 'outside_hours' };
          }

          const { data: isAvailable, error } = await supabase
            .rpc('check_therapist_availability', {
              p_therapist_id: therapistId,
              p_appointment_date: date,
              p_appointment_time: slot,
              p_duration: selectedServiceDuration
            });

          if (error) {
            console.error("Error checking slot availability:", slot, error);
            return { slot, available: false, reason: 'error' };
          }

          return { slot, available: isAvailable, reason: isAvailable ? 'available' : 'unavailable' };
        } catch (error) {
          console.error("Error checking slot:", slot, error);
          return { slot, available: false, reason: 'error' };
        }
      });

      // Poczekaj na wszystkie sprawdzenia
      const results = await Promise.all(availabilityChecks);
      
      // Filtruj tylko dostępne sloty
      const finalAvailableSlots = results
        .filter(result => result.available)
        .map(result => result.slot);
      
      const unavailableSlots = results
        .filter(result => !result.available)
        .map(result => ({ slot: result.slot, reason: result.reason }));
      
      console.log("Available times:", finalAvailableSlots);
      console.log("Unavailable times:", unavailableSlots);
      
      setAvailableTimes(finalAvailableSlots);
    } catch (error: any) {
      console.error("Error checking availability:", error);
      // W przypadku błędu, pokaż wszystkie sloty
      setAvailableTimes(timeSlots);
    } finally {
      setLoading(false);
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

  const handleDateSelect = async (date: string) => {
    setSelectedDate(date);
    setSelectedTime(""); // Reset selected time when date changes
    setAvailableTimes([]); // Clear available times while loading
    
    if (selectedTherapist) {
      await checkAvailableTimes(date, selectedTherapist.id);
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
      console.log('Checking voucher code:', voucherCode.toUpperCase());
      
      const { data, error } = await supabase
        .from('vouchers')
        .select(`
          *,
          services(id, name, price)
        `)
        .eq('code', voucherCode.toUpperCase())
        .eq('status', 'active')
        .or(`service_id.is.null,service_id.eq.${selectedService?.id}`)
        .maybeSingle();

      console.log('Voucher query result:', { data, error });

      if (error) {
        console.error('Voucher query error:', error);
        setVoucherError("Błąd podczas sprawdzania bonu");
        setVoucherData(null);
        return;
      }

      if (!data) {
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
      // Check if the selected time slot is available using the therapist schedule validation
      const { data: isAvailable, error: availabilityError } = await supabase
        .rpc('check_therapist_availability', {
          p_therapist_id: selectedTherapist.id,
          p_appointment_date: selectedDate,
          p_appointment_time: selectedTime,
          p_duration: selectedService.duration
        });

      if (availabilityError) {
        console.error("Error checking availability:", availabilityError);
        toast({
          title: "Błąd",
          description: "Nie udało się sprawdzić dostępności terminu",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!isAvailable) {
        toast({
          title: "Błąd",
          description: "Ten termin nie jest dostępny w grafiku terapeuty lub jest już zajęty. Proszę wybrać inną godzinę.",
          variant: "destructive",
        });
        // Refresh available times for selected date
        if (selectedDate && selectedTherapist) {
          checkAvailableTimes(selectedDate, selectedTherapist.id);
        }
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
        duration: selectedService.duration,
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
        // Handle duplicate key or overlap constraint specifically
        if (insertError.code === '23505' || insertError.code === '23P01') {
          toast({
            title: "Błąd",
            description: insertError.code === '23P01' 
              ? "Ten termin koliduje z inną wizytą. Proszę wybrać inną godzinę."
              : "Ten termin został właśnie zarezerwowany przez kogoś innego. Proszę wybrać inną godzinę.",
            variant: "destructive",
          });
          
          // Refresh available times for selected date
          if (selectedDate && selectedTherapist) {
            checkAvailableTimes(selectedDate, selectedTherapist.id);
          }
          
          setStep(4); // Go back to time selection
          setSelectedTime(""); // Clear selected time
          setLoading(false);
          return;
        }
        
        console.error("Error creating appointment:", insertError);
        toast({
          title: "Błąd",
          description: "Nie udało się zarezerwować wizyty. Spróbuj ponownie.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Process voucher if used
      if (voucherData && appointment) {
        try {
          const { data: redemptionResult, error: redemptionError } = await supabase
            .rpc('process_voucher_redemption', {
              p_voucher_code: voucherData.code,
              p_appointment_id: appointment.id,
              p_service_price: selectedService.price
            });

          if (redemptionError) {
            console.error('Error processing voucher redemption:', redemptionError);
            // Don't fail the whole booking if voucher processing fails
            toast({
              title: "Ostrzeżenie",
              description: "Wizyta została zarezerwowana, ale wystąpił problem z przetworzeniem bonu. Skontaktuj się z administracją.",
              variant: "destructive",
            });
          } else {
            console.log('Voucher redemption successful:', redemptionResult);
          }
        } catch (redemptionError) {
          console.error('Error processing voucher:', redemptionError);
        }
      }

      toast({
        title: "Sukces",
        description: "Wizyta została pomyślnie zarezerwowana!",
      });

      // Navigate to dashboard or confirmation page
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error creating appointment:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zarezerwować wizyty",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null; // This will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Steps Indicator */}
        <div className="mb-8">
          <div className="flex justify-center">
            <div className="flex items-center space-x-4">
              {[
                { num: 1, label: "Usługa", icon: "💆‍♀️" },
                { num: 2, label: "Terapeuta", icon: "👤" },
                { num: 3, label: "Data", icon: "📅" },
                { num: 4, label: "Godzina", icon: "🕐" },
                { num: 5, label: "Podsumowanie", icon: "✅" },
              ].map((stepItem, index) => (
                <div key={stepItem.num} className="flex items-center">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                      step >= stepItem.num 
                        ? 'bg-hanami-primary text-white' 
                        : 'bg-hanami-accent text-hanami-neutral'
                    }`}
                  >
                    {stepItem.num}
                  </div>
                  <span className="ml-2 text-sm text-hanami-neutral hidden sm:block">
                    {stepItem.label}
                  </span>
                  {index < 4 && (
                    <div className={`w-8 h-0.5 mx-4 ${
                      step > stepItem.num ? 'bg-hanami-primary' : 'bg-hanami-accent'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <Card className="border-hanami-accent/20">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-hanami-primary">
              Rezerwacja wizyty
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* Step 1: Service Selection */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold">Wybierz usługę</h3>
                  {/* Category Filters */}
                  <div className="flex flex-wrap gap-2">
                    {categoriesList.map((category) => (
                      <Badge 
                        key={category} 
                        variant={selectedCategory === category ? "default" : "outline"}
                        className="cursor-pointer hover:bg-hanami-secondary transition-zen"
                        onClick={() => setSelectedCategory(category)}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredServices.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <p className="text-hanami-neutral text-lg">
                        Brak usług w wybranej kategorii.
                      </p>
                    </div>
                  ) : (
                    filteredServices.map((service) => (
                      <Card
                        key={service.id}
                        className={`cursor-pointer transition-all ${
                          selectedService?.id === service.id 
                            ? 'ring-2 ring-hanami-primary bg-hanami-secondary/10' 
                            : 'hover:shadow-md'
                        }`}
                        onClick={() => handleServiceSelect(service)}
                      >
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-hanami-primary">{service.name}</h4>
                            <Badge variant="secondary">{service.category}</Badge>
                          </div>
                          <p className="text-sm text-hanami-neutral mb-4">{service.description}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-hanami-primary">
                              {service.price} zł
                            </span>
                            <span className="text-sm text-hanami-neutral">
                              {service.duration} min
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Therapist Selection */}
            {step === 2 && selectedService && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold">Wybierz terapeutę</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableTherapists.map((therapist) => (
                    <Card
                      key={therapist.id}
                      className={`cursor-pointer transition-all ${
                        selectedTherapist?.id === therapist.id 
                          ? 'ring-2 ring-hanami-primary bg-hanami-secondary/10' 
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => handleTherapistSelect(therapist)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-4">
                          <img
                            src={therapist.avatar_url || "/placeholder.svg"}
                            alt={therapist.name}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                          <div>
                            <h4 className="font-semibold text-hanami-primary">{therapist.name}</h4>
                            <p className="text-sm text-hanami-neutral">{therapist.specialization}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Date Selection */}
            {step === 3 && selectedTherapist && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold">Wybierz datę</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {generateAvailableDates().map((date) => {
                    const dateObj = new Date(date);
                    const isSelected = selectedDate === date;
                    const dayName = dateObj.toLocaleDateString('pl-PL', { weekday: 'short' });
                    const dayNumber = dateObj.getDate();
                    const monthName = dateObj.toLocaleDateString('pl-PL', { month: 'short' });
                    
                    return (
                      <Button
                        key={date}
                        variant={isSelected ? "default" : "outline"}
                        className={`h-auto p-4 flex flex-col items-center space-y-1 ${
                          isSelected 
                            ? 'ring-2 ring-hanami-primary bg-hanami-primary text-white' 
                            : 'hover:bg-hanami-secondary/10'
                        }`}
                        onClick={() => handleDateSelect(date)}
                      >
                        <span className="text-xs font-medium">{dayName}</span>
                        <span className="text-lg font-bold">{dayNumber}</span>
                        <span className="text-xs">{monthName}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Time Selection */}
            {step === 4 && selectedDate && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold">Wybierz godzinę</h3>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hanami-primary mx-auto"></div>
                    <p className="mt-2 text-hanami-neutral">Sprawdzanie dostępności...</p>
                  </div>
                ) : availableTimes.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-hanami-neutral">Brak dostępnych terminów w wybranym dniu.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {availableTimes.map((time) => (
                      <Button
                        key={time}
                        variant={selectedTime === time ? "default" : "outline"}
                        className={`h-12 ${
                          selectedTime === time 
                            ? 'ring-2 ring-hanami-primary bg-hanami-primary text-white' 
                            : 'hover:bg-hanami-secondary/10'
                        }`}
                        onClick={() => handleTimeSelect(time)}
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Summary and Voucher */}
            {step === 5 && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold">Podsumowanie rezerwacji</h3>
                
                {/* Booking Summary */}
                <Card className="border-hanami-accent/20">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-hanami-neutral">Usługa:</span>
                        <span className="font-medium">{selectedService?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-hanami-neutral">Terapeuta:</span>
                        <span className="font-medium">{selectedTherapist?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-hanami-neutral">Data:</span>
                        <span className="font-medium">
                          {selectedDate && new Date(selectedDate).toLocaleDateString('pl-PL')}
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
                      <div className="border-t pt-4">
                        <div className="flex justify-between text-lg font-bold">
                          <span>Cena końcowa:</span>
                          <span className="text-hanami-primary">
                            {voucherData ? calculateFinalPrice() : selectedService?.price} zł
                          </span>
                        </div>
                        {voucherData && (
                          <div className="text-sm text-green-600 mt-1">
                            Zastosowano bon: {voucherData.code}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Voucher Section */}
                <Card className="border-hanami-accent/20">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2 mb-4">
                      <Gift className="h-5 w-5 text-hanami-primary" />
                      <h4 className="font-semibold">Bon rabatowy (opcjonalnie)</h4>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Wprowadź kod bonu"
                          value={voucherCode}
                          onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                          disabled={!!voucherData}
                        />
                        <Button 
                          onClick={verifyVoucher}
                          disabled={!!voucherData || !voucherCode.trim()}
                        >
                          Sprawdź
                        </Button>
                      </div>
                      
                      {voucherError && (
                        <p className="text-red-500 text-sm">{voucherError}</p>
                      )}
                      
                      {voucherData && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-green-800">Bon został zastosowany!</p>
                              <p className="text-sm text-green-600">
                                {voucherData.voucher_type === 'single' 
                                  ? `Rabat: ${Math.min(voucherData.remaining_value, selectedService?.price || 0)} zł`
                                  : `Sesja z pakietu (pozostało: ${voucherData.remaining_sessions})`
                                }
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setVoucherData(null);
                                setVoucherCode("");
                                setVoucherError("");
                              }}
                            >
                              Usuń
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Notes Section */}
                <div className="space-y-4">
                  <Label htmlFor="notes">Dodatkowe uwagi (opcjonalnie)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Wpisz dodatkowe informacje dla terapeuty..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Confirm Button */}
                <Button 
                  onClick={handleConfirm} 
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? "Rezerwuję..." : "Potwierdź rezerwację"}
                </Button>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Wstecz
              </Button>
              
              {step < 5 && (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={
                    (step === 1 && !selectedService) ||
                    (step === 2 && !selectedTherapist) ||
                    (step === 3 && !selectedDate) ||
                    (step === 4 && !selectedTime)
                  }
                >
                  Dalej
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
};

export default Booking;