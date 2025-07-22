import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, User, CheckCircle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Booking = () => {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedTherapist, setSelectedTherapist] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");

  const services = [
    {
      id: 1,
      name: "Masaż relaksacyjny",
      duration: 60,
      price: 200,
      description: "Tradycyjny masaż inspirowany japońską filozofią zen"
    },
    {
      id: 2,
      name: "Masaż terapeutyczny", 
      duration: 90,
      price: 280,
      description: "Profesjonalny masaż leczniczy dla zdrowia kręgosłupa"
    },
    {
      id: 3,
      name: "Masaż hot stone",
      duration: 75,
      price: 350,
      description: "Relaksujący masaż z użyciem rozgrzanych kamieni"
    }
  ];

  const therapists = [
    {
      id: 1,
      name: "Anna Kowalska",
      specialization: "Masaże terapeutyczne",
      experience: "8 lat doświadczenia",
      availability: ["2024-01-25", "2024-01-26", "2024-01-27"]
    },
    {
      id: 2, 
      name: "Maria Nowak",
      specialization: "Masaże relaksacyjne",
      experience: "5 lat doświadczenia", 
      availability: ["2024-01-25", "2024-01-26", "2024-01-28"]
    }
  ];

  const timeSlots = [
    "09:00", "10:30", "12:00", "13:30", "15:00", "16:30", "18:00"
  ];

  const handleServiceSelect = (service: any) => {
    setSelectedService(service);
    setStep(2);
  };

  const handleTherapistSelect = (therapist: any) => {
    setSelectedTherapist(therapist);
    setStep(3);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setStep(4);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep(5);
  };

  const handleConfirm = () => {
    // TODO: Implement booking confirmation
    console.log("Booking confirmed:", {
      service: selectedService,
      therapist: selectedTherapist,
      date: selectedDate,
      time: selectedTime
    });
  };

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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                        <p className="text-hanami-neutral">
                          <strong>Specjalizacja:</strong> {therapist.specialization}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="mt-6">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Wróć do wyboru usługi
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Date Selection */}
          {step === 3 && selectedTherapist && (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-hanami-primary">
                  Wybierz datę
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-7 gap-4">
                  {selectedTherapist.availability.map((date: string) => (
                    <Button
                      key={date}
                      variant="outline"
                      className="p-4 h-auto flex flex-col"
                      onClick={() => handleDateSelect(date)}
                    >
                      <Calendar className="h-5 w-5 mb-2" />
                      <span className="text-sm">{new Date(date).toLocaleDateString('pl-PL', { 
                        day: 'numeric', 
                        month: 'short' 
                      })}</span>
                    </Button>
                  ))}
                </div>
                <div className="mt-6">
                  <Button variant="outline" onClick={() => setStep(2)}>
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
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                  {timeSlots.map((time) => (
                    <Button
                      key={time}
                      variant="outline"
                      className="p-4"
                      onClick={() => handleTimeSelect(time)}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      {time}
                    </Button>
                  ))}
                </div>
                <div className="mt-6">
                  <Button variant="outline" onClick={() => setStep(3)}>
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
                          {new Date(selectedDate).toLocaleDateString('pl-PL')}
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

                  <div className="flex space-x-4">
                    <Button variant="outline" onClick={() => setStep(4)}>
                      Wróć do wyboru godziny
                    </Button>
                    <Button onClick={handleConfirm} className="flex-1">
                      Potwierdź rezerwację
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