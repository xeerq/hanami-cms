import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Users, Briefcase } from "lucide-react";

interface Therapist {
  id: string;
  name: string;
  specialization: string;
  is_active: boolean;
}

interface Service {
  id: string;
  name: string;
  duration: number;
  category: string;
  is_active: boolean;
}

interface TherapistService {
  therapist_id: string;
  service_id: string;
}

const TherapistServicesManager = () => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [therapistServices, setTherapistServices] = useState<TherapistService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Pobierz terapeutów
      const { data: therapistsData, error: therapistsError } = await supabase
        .from("therapists")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (therapistsError) throw therapistsError;

      // Pobierz usługi
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("category, name");

      if (servicesError) throw servicesError;

      // Pobierz istniejące przypisania
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("therapist_services")
        .select("therapist_id, service_id");

      if (assignmentsError) throw assignmentsError;

      setTherapists(therapistsData || []);
      setServices(servicesData || []);
      setTherapistServices(assignmentsData || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować danych",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isServiceAssignedToTherapist = (therapistId: string, serviceId: string) => {
    return therapistServices.some(
      (ts) => ts.therapist_id === therapistId && ts.service_id === serviceId
    );
  };

  const toggleServiceAssignment = (therapistId: string, serviceId: string) => {
    const isCurrentlyAssigned = isServiceAssignedToTherapist(therapistId, serviceId);
    
    if (isCurrentlyAssigned) {
      // Usuń przypisanie
      setTherapistServices(prev => 
        prev.filter(ts => !(ts.therapist_id === therapistId && ts.service_id === serviceId))
      );
    } else {
      // Dodaj przypisanie
      setTherapistServices(prev => [...prev, { therapist_id: therapistId, service_id: serviceId }]);
    }
  };

  const saveChanges = async () => {
    try {
      setSaving(true);

      // Najpierw usuń wszystkie istniejące przypisania
      const { error: deleteError } = await supabase
        .from("therapist_services")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Usuń wszystkie rekordy

      if (deleteError) throw deleteError;

      // Następnie dodaj nowe przypisania
      if (therapistServices.length > 0) {
        const { error: insertError } = await supabase
          .from("therapist_services")
          .insert(therapistServices);

        if (insertError) throw insertError;
      }

      toast({
        title: "Sukces",
        description: "Przypisania usług zostały zapisane",
      });
    } catch (error: any) {
      console.error("Error saving assignments:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zapisać przypisań",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Grupuj usługi według kategorii
  const servicesByCategory = services.reduce((acc, service) => {
    const category = service.category || "Inne";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  if (loading) {
    return (
      <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-hanami-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <CardTitle className="text-2xl font-light bg-gradient-to-r from-hanami-primary to-hanami-accent bg-clip-text text-transparent flex items-center">
            <Briefcase className="h-6 w-6 mr-2 text-hanami-primary" />
            Przypisania Usług do Terapeutów
          </CardTitle>
          <Button
            onClick={saveChanges}
            disabled={saving}
            className="bg-gradient-to-r from-hanami-primary to-hanami-accent hover:from-hanami-accent hover:to-hanami-primary transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Zapisz zmiany
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-8">
            {/* Nagłówek z nazwami terapeutów */}
            <div className="grid grid-cols-1 gap-4">
              <div className="grid gap-4" style={{ gridTemplateColumns: `300px repeat(${therapists.length}, 1fr)` }}>
                <div className="font-semibold text-gray-700 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Usługi / Terapeuci
                </div>
                {therapists.map((therapist) => (
                  <div
                    key={therapist.id}
                    className="text-center p-3 bg-gradient-to-br from-hanami-primary/10 to-hanami-accent/10 rounded-lg border border-hanami-primary/20"
                  >
                    <div className="font-semibold text-sm text-gray-800">{therapist.name}</div>
                    <div className="text-xs text-gray-600 mt-1">{therapist.specialization}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Przypisania usług */}
            <div className="space-y-6">
              {Object.entries(servicesByCategory).map(([category, categoryServices]) => (
                <div key={category} className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-800 bg-gradient-to-r from-hanami-primary/20 to-hanami-accent/20 px-4 py-2 rounded-lg border-l-4 border-hanami-primary">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {categoryServices.map((service) => (
                      <div
                        key={service.id}
                        className="grid gap-4 p-3 bg-white rounded-lg border border-gray-200 hover:border-hanami-primary/30 transition-colors duration-200"
                        style={{ gridTemplateColumns: `300px repeat(${therapists.length}, 1fr)` }}
                      >
                        <div className="flex flex-col justify-center">
                          <div className="font-medium text-gray-800">{service.name}</div>
                          <div className="text-sm text-gray-600">{service.duration} min</div>
                        </div>
                        {therapists.map((therapist) => (
                          <div key={therapist.id} className="flex items-center justify-center">
                            <Checkbox
                              checked={isServiceAssignedToTherapist(therapist.id, service.id)}
                              onCheckedChange={() => toggleServiceAssignment(therapist.id, service.id)}
                              className="data-[state=checked]:bg-hanami-primary data-[state=checked]:border-hanami-primary"
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {services.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Brak usług do wyświetlenia</p>
              </div>
            )}

            {therapists.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Brak terapeutów do wyświetlenia</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TherapistServicesManager;