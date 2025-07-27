import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, ShoppingBag, Settings, Clock, Heart, Utensils, Star } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProfileForm from "@/components/ProfileForm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const [selectedCalories, setSelectedCalories] = useState(1500);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [appointmentHistory, setAppointmentHistory] = useState<any[]>([]);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      setLoading(true);

      // Załaduj nadchodzące wizyty
      const today = new Date().toISOString().split('T')[0];
      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select(`
          *,
          services(name, duration, price),
          therapists(name)
        `)
        .eq("user_id", user.id)
        .gte("appointment_date", today)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });

      if (appointmentsError) throw appointmentsError;

      // Załaduj historię wizyt
      const { data: history, error: historyError } = await supabase
        .from("appointments")
        .select(`
          *,
          services(name, duration, price),
          therapists(name)
        `)
        .eq("user_id", user.id)
        .lt("appointment_date", today)
        .order("appointment_date", { ascending: false })
        .order("appointment_time", { ascending: false });

      if (historyError) throw historyError;

      // Załaduj historię zamówień
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(
            *,
            products(name)
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      setUpcomingAppointments(appointments || []);
      setAppointmentHistory(history || []);
      setOrderHistory(orders || []);

    } catch (error: any) {
      console.error("Error loading user data:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować danych",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const canCancelAppointment = (appointmentDate: string, appointmentTime: string) => {
    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    const now = new Date();
    const timeDiff = appointmentDateTime.getTime() - now.getTime();
    const hoursUntilAppointment = timeDiff / (1000 * 60 * 60);
    
    return hoursUntilAppointment > 24;
  };

  const handleCancelAppointment = async (appointmentId: string, appointmentDate: string, appointmentTime: string) => {
    if (!canCancelAppointment(appointmentDate, appointmentTime)) {
      toast({
        title: "Nie można anulować wizyty",
        description: "Wizytę można anulować tylko na 24 godziny przed terminem. Aby anulować wizytę, skontaktuj się bezpośrednio z salonem.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appointmentId);

      if (error) throw error;

      toast({
        title: "Wizyta anulowana",
        description: "Wizyta została pomyślnie anulowana.",
      });

      // Odśwież dane
      loadUserData();
    } catch (error: any) {
      console.error("Error cancelling appointment:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się anulować wizyty",
        variant: "destructive",
      });
    }
  };

  const handleBookNewAppointment = () => {
    navigate('/booking');
  };

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
                  {loading ? (
                    <div className="text-center py-8">
                      <p>Ładowanie wizyt...</p>
                    </div>
                  ) : upcomingAppointments.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-hanami-neutral">Brak nadchodzących wizyt</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {upcomingAppointments.map((appointment) => (
                        <div key={appointment.id} className="flex items-center justify-between p-4 border border-hanami-accent/20 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-hanami-secondary rounded-full flex items-center justify-center">
                              <Calendar className="h-6 w-6 text-hanami-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-hanami-primary">
                                {appointment.services?.name}
                              </h3>
                              <p className="text-sm text-hanami-neutral">
                                {appointment.therapists?.name} • {appointment.services?.duration} min
                              </p>
                              <p className="text-sm text-hanami-neutral">
                                {new Date(appointment.appointment_date).toLocaleDateString('pl-PL')} o {appointment.appointment_time.slice(0, 5)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">
                              {appointment.status === 'confirmed' ? 'Potwierdzona' : appointment.status}
                            </Badge>
                            {appointment.status === 'confirmed' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleCancelAppointment(appointment.id, appointment.appointment_date, appointment.appointment_time)}
                                className={!canCancelAppointment(appointment.appointment_date, appointment.appointment_time) ? 'opacity-50' : ''}
                              >
                                {canCancelAppointment(appointment.appointment_date, appointment.appointment_time) ? 'Anuluj' : 'Skontaktuj się z salonem'}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-6">
                    <Button onClick={handleBookNewAppointment}>Zarezerwuj nową wizytę</Button>
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
                  {loading ? (
                    <div className="text-center py-8">
                      <p>Ładowanie historii...</p>
                    </div>
                  ) : appointmentHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-hanami-neutral">Brak historii wizyt</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {appointmentHistory.map((appointment) => (
                        <div key={appointment.id} className="flex items-center justify-between p-4 border border-hanami-accent/20 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-hanami-secondary rounded-full flex items-center justify-center">
                              <Clock className="h-6 w-6 text-hanami-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-hanami-primary">
                                {appointment.services?.name}
                              </h3>
                              <p className="text-sm text-hanami-neutral">
                                {appointment.therapists?.name}
                              </p>
                              <p className="text-sm text-hanami-neutral">
                                {new Date(appointment.appointment_date).toLocaleDateString('pl-PL')} o {appointment.appointment_time.slice(0, 5)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`h-4 w-4 ${
                                    i < 5 
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
                  )}
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
                  {loading ? (
                    <div className="text-center py-8">
                      <p>Ładowanie zamówień...</p>
                    </div>
                  ) : orderHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-hanami-neutral">Brak historii zamówień</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orderHistory.map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-4 border border-hanami-accent/20 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-hanami-secondary rounded-full flex items-center justify-center">
                              <ShoppingBag className="h-6 w-6 text-hanami-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-hanami-primary">
                                Zamówienie #{order.id.slice(0, 8)}
                              </h3>
                              <p className="text-sm text-hanami-neutral">
                                {order.order_items?.map((item: any) => item.products?.name).join(", ") || "Brak produktów"}
                              </p>
                              <p className="text-sm text-hanami-neutral">
                                {new Date(order.created_at).toLocaleDateString('pl-PL')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-hanami-primary">
                              {order.total_amount} zł
                            </p>
                            <Badge variant="outline">
                              {order.status === 'delivered' ? 'Dostarczone' : order.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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