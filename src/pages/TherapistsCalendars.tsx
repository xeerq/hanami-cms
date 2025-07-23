import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TherapistCalendar from "@/components/therapist/TherapistCalendar";

interface Therapist {
  id: string;
  name: string;
  specialization?: string;
  bio?: string;
}

interface TherapistsCalendarsViewProps {
  embedded?: boolean; // Czy komponent jest używany wewnątrz innego komponentu
}

const TherapistsCalendarsView = ({ embedded = false }: TherapistsCalendarsViewProps) => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTherapists();
  }, []);

  const fetchTherapists = async () => {
    try {
      const { data, error } = await supabase
        .from("therapists")
        .select("id, name, specialization, bio")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setTherapists(data || []);
    } catch (error: any) {
      console.error("Error fetching therapists:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować listy masażystów",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    if (embedded) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hanami-primary mx-auto"></div>
            <p className="mt-2 text-hanami-neutral">Ładowanie kalendarzy masażystów...</p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-gradient-warm">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-hanami-primary mx-auto"></div>
            <p className="mt-4 text-hanami-neutral">Ładowanie kalendarzy masażystów...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const content = (
    <div>
      {therapists.length === 0 ? (
        <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
          <CardContent className="p-12 text-center">
            <Users className="h-16 w-16 text-hanami-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-hanami-primary mb-2">
              Brak aktywnych masażystów
            </h3>
            <p className="text-hanami-neutral">
              Obecnie nie ma żadnych aktywnych masażystów w systemie.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={therapists[0]?.id} className="space-y-8">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
            <TabsList className="grid w-full gap-2" style={{ gridTemplateColumns: `repeat(${therapists.length}, minmax(0, 1fr))` }}>
              {therapists.map((therapist) => (
                <TabsTrigger 
                  key={therapist.id} 
                  value={therapist.id}
                  className="flex flex-col items-center space-y-1 p-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-hanami-primary data-[state=active]:to-hanami-accent data-[state=active]:text-white"
                >
                  <Users className="h-5 w-5" />
                  <span className="font-medium">{therapist.name}</span>
                  {therapist.specialization && (
                    <span className="text-xs opacity-70">{therapist.specialization}</span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {therapists.map((therapist) => (
            <TabsContent key={therapist.id} value={therapist.id} className="space-y-6">
              <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-hanami-primary to-hanami-accent rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-light text-hanami-primary">
                        {therapist.name}
                      </CardTitle>
                      {therapist.specialization && (
                        <CardDescription className="text-hanami-neutral">
                          Specjalizacja: {therapist.specialization}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  {therapist.bio && (
                    <div className="mt-4 p-4 bg-hanami-secondary/20 rounded-xl">
                      <p className="text-sm text-hanami-neutral">{therapist.bio}</p>
                    </div>
                  )}
                </CardHeader>
              </Card>
              
              <TherapistCalendar therapistId={therapist.id} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Header />
      
      {/* Hero Section */}
      <section className="py-12 bg-gradient-hanami text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3 mb-4">
            <Calendar className="h-10 w-10" />
            <h1 className="text-4xl font-light">Kalendarze Masażystów</h1>
          </div>
          <p className="text-xl text-white/90">
            Przegląd dostępności i wizyt wszystkich masażystów
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {content}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default TherapistsCalendarsView;