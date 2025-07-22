import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, ShoppingBag, Settings, Clock, Heart, Utensils, Star } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProfileForm from "@/components/ProfileForm";

const Dashboard = () => {
  const [selectedCalories, setSelectedCalories] = useState(1500);

  const upcomingAppointments = [
    {
      id: 1,
      service: "Masaż relaksacyjny",
      therapist: "Anna Kowalska",
      date: "2024-01-25",
      time: "14:00",
      duration: 60,
      status: "confirmed"
    },
    {
      id: 2,
      service: "Masaż hot stone",
      therapist: "Maria Nowak", 
      date: "2024-02-02",
      time: "16:30",
      duration: 75,
      status: "confirmed"
    }
  ];

  const appointmentHistory = [
    {
      id: 1,
      service: "Masaż terapeutyczny",
      therapist: "Anna Kowalska",
      date: "2024-01-15",
      time: "15:00",
      status: "completed",
      rating: 5
    },
    {
      id: 2,
      service: "Masaż relaksacyjny",
      therapist: "Maria Nowak",
      date: "2024-01-10",
      time: "10:30", 
      status: "completed",
      rating: 5
    }
  ];

  const orderHistory = [
    {
      id: 1,
      items: ["Olejek do masażu Sakura", "Świeca aromaterapeutyczna"],
      total: 134,
      date: "2024-01-20",
      status: "delivered"
    },
    {
      id: 2,
      items: ["Krem regenerujący Hanami"],
      total: 65,
      date: "2024-01-18",
      status: "delivered"
    }
  ];

  const generateMealPlan = () => {
    const meals = {
      1200: {
        breakfast: "Owsianka z jagodami i migdałami (300 kcal)",
        lunch: "Sałatka z kurczakiem i quinoa (400 kcal)",
        dinner: "Pieczony łosoś z warzywami (350 kcal)",
        snacks: "Jogurt naturalny z orzechami (150 kcal)"
      },
      1500: {
        breakfast: "Omlet z warzywami i awokado (400 kcal)",
        lunch: "Curry z ciecierzycą i ryżem brązowym (500 kcal)",
        dinner: "Grillowany kurczak z batatami (450 kcal)", 
        snacks: "Smoothie z bananem i szpinakiem (150 kcal)"
      },
      1800: {
        breakfast: "Tosty z awokado i jajkiem (500 kcal)",
        lunch: "Bowl z łososiem i quinoa (600 kcal)",
        dinner: "Makaron z krewetkami i warzywami (550 kcal)",
        snacks: "Orzechy i owoce (150 kcal)"
      },
      2000: {
        breakfast: "Pancakes owsiane z owocami (550 kcal)",
        lunch: "Burger z indyka z frytkami z batata (700 kcal)",
        dinner: "Risotto z kurczakiem i grzybami (600 kcal)",
        snacks: "Batonik proteinowy i owoc (150 kcal)"
      }
    };
    
    return meals[selectedCalories as keyof typeof meals] || meals[1500];
  };

  const mealPlan = generateMealPlan();

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Header />
      
      {/* Hero Section */}
      <section className="py-12 bg-gradient-hanami text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-light mb-4">Panel klienta</h1>
          <p className="text-xl text-white/90">
            Zarządzaj swoimi wizytami, zamówieniami i profilem
          </p>
        </div>
      </section>

      {/* Dashboard Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="appointments" className="space-y-8">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="appointments" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Wizyty</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Historia</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center space-x-2">
                <ShoppingBag className="h-4 w-4" />
                <span className="hidden sm:inline">Zamówienia</span>
              </TabsTrigger>
              <TabsTrigger value="meals" className="flex items-center space-x-2">
                <Utensils className="h-4 w-4" />
                <span className="hidden sm:inline">Jadłospis</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profil</span>
              </TabsTrigger>
            </TabsList>

            {/* Upcoming Appointments */}
            <TabsContent value="appointments">
              <Card>
                <CardHeader>
                  <CardTitle className="text-hanami-primary">Nadchodzące wizyty</CardTitle>
                  <CardDescription>
                    Zarządzaj swoimi zarezerwowanymi wizytami
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {upcomingAppointments.map((appointment) => (
                      <div key={appointment.id} className="flex items-center justify-between p-4 border border-hanami-accent/20 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-hanami-secondary rounded-full flex items-center justify-center">
                            <Calendar className="h-6 w-6 text-hanami-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-hanami-primary">
                              {appointment.service}
                            </h3>
                            <p className="text-sm text-hanami-neutral">
                              {appointment.therapist} • {appointment.duration} min
                            </p>
                            <p className="text-sm text-hanami-neutral">
                              {new Date(appointment.date).toLocaleDateString('pl-PL')} o {appointment.time}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">Potwierdzona</Badge>
                          <Button variant="outline" size="sm">
                            Anuluj
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6">
                    <Button>Zarezerwuj nową wizytę</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appointment History */}
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle className="text-hanami-primary">Historia wizyt</CardTitle>
                  <CardDescription>
                    Przeglądaj historię swoich wizyt w spa
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {appointmentHistory.map((appointment) => (
                      <div key={appointment.id} className="flex items-center justify-between p-4 border border-hanami-accent/20 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-hanami-secondary rounded-full flex items-center justify-center">
                            <Clock className="h-6 w-6 text-hanami-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-hanami-primary">
                              {appointment.service}
                            </h3>
                            <p className="text-sm text-hanami-neutral">
                              {appointment.therapist}
                            </p>
                            <p className="text-sm text-hanami-neutral">
                              {new Date(appointment.date).toLocaleDateString('pl-PL')} o {appointment.time}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`h-4 w-4 ${
                                  i < appointment.rating 
                                    ? "text-yellow-400 fill-current" 
                                    : "text-gray-300"
                                }`} 
                              />
                            ))}
                          </div>
                          <Button variant="outline" size="sm">
                            Zarezerwuj ponownie
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Order History */}
            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle className="text-hanami-primary">Historia zamówień</CardTitle>
                  <CardDescription>
                    Przeglądaj swoje zamówienia ze sklepu
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {orderHistory.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 border border-hanami-accent/20 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-hanami-secondary rounded-full flex items-center justify-center">
                            <ShoppingBag className="h-6 w-6 text-hanami-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-hanami-primary">
                              Zamówienie #{order.id}
                            </h3>
                            <p className="text-sm text-hanami-neutral">
                              {order.items.join(", ")}
                            </p>
                            <p className="text-sm text-hanami-neutral">
                              {new Date(order.date).toLocaleDateString('pl-PL')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-hanami-primary">
                            {order.total} zł
                          </p>
                          <Badge variant="outline">Dostarczone</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Meal Plan Generator */}
            <TabsContent value="meals">
              <Card>
                <CardHeader>
                  <CardTitle className="text-hanami-primary">Generator jadłospisu</CardTitle>
                  <CardDescription>
                    Wygeneruj personalizowany plan posiłków na podstawie docelowej liczby kalorii
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Calorie Selection */}
                    <div>
                      <label className="block text-sm font-medium text-hanami-primary mb-3">
                        Wybierz dzienną liczbę kalorii:
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1200, 1500, 1800, 2000].map((calories) => (
                          <Button
                            key={calories}
                            variant={selectedCalories === calories ? "default" : "outline"}
                            onClick={() => setSelectedCalories(calories)}
                          >
                            {calories} kcal
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Generated Meal Plan */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="border-hanami-accent/20">
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-hanami-primary mb-2 flex items-center">
                            <Utensils className="h-4 w-4 mr-2" />
                            Śniadanie
                          </h3>
                          <p className="text-sm text-hanami-neutral">{mealPlan.breakfast}</p>
                        </CardContent>
                      </Card>

                      <Card className="border-hanami-accent/20">
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-hanami-primary mb-2 flex items-center">
                            <Utensils className="h-4 w-4 mr-2" />
                            Obiad
                          </h3>
                          <p className="text-sm text-hanami-neutral">{mealPlan.lunch}</p>
                        </CardContent>
                      </Card>

                      <Card className="border-hanami-accent/20">
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-hanami-primary mb-2 flex items-center">
                            <Utensils className="h-4 w-4 mr-2" />
                            Kolacja
                          </h3>
                          <p className="text-sm text-hanami-neutral">{mealPlan.dinner}</p>
                        </CardContent>
                      </Card>

                      <Card className="border-hanami-accent/20">
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-hanami-primary mb-2 flex items-center">
                            <Heart className="h-4 w-4 mr-2" />
                            Przekąski
                          </h3>
                          <p className="text-sm text-hanami-neutral">{mealPlan.snacks}</p>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="bg-hanami-cream p-4 rounded-lg">
                      <p className="text-sm text-hanami-neutral">
                        <strong>Uwaga:</strong> Przedstawiony jadłospis ma charakter orientacyjny. 
                        Przed wprowadzeniem zmian w diecie zalecamy konsultację z dietetykiem.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Profile Settings */}
            <TabsContent value="profile">
              <ProfileForm />
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Dashboard;