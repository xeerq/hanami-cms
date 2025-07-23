import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Plus, Edit, Trash2, CheckCircle, XCircle, Clock, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CreateServiceDialog from "./CreateServiceDialog";
import EditServiceDialog from "./EditServiceDialog";

interface Service {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  category?: string;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
}

const ServicesManager = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchServices();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("type", "service")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error("Error fetching categories:", error);
    }
  };


  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("category")
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
    } finally {
      setLoading(false);
    }
  };

  const toggleServiceStatus = async (serviceId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("services")
        .update({ is_active: !isActive })
        .eq("id", serviceId);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: `Usługa została ${!isActive ? 'aktywowana' : 'dezaktywowana'}`,
      });

      fetchServices();
    } catch (error: any) {
      console.error("Error updating service:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować usługi",
        variant: "destructive",
      });
    }
  };

  const deleteService = async (serviceId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć tę usługę? Ta operacja jest nieodwracalna.")) return;

    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", serviceId);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Usługa została usunięta",
      });

      fetchServices();
    } catch (error: any) {
      console.error("Error deleting service:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć usługi",
        variant: "destructive",
      });
    }
  };

  const handleEditService = (service: Service) => {
    setSelectedService(service);
    setShowEditDialog(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Zarządzanie usługami</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hanami-primary mx-auto"></div>
            <p className="mt-2 text-hanami-neutral">Ładowanie usług...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-hanami-primary">Zarządzanie usługami</CardTitle>
              <CardDescription>
                Dodawaj, edytuj i zarządzaj oferowanymi usługami
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Dodaj usługę
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {services.length === 0 ? (
              <div className="text-center py-8 text-hanami-neutral">
                Brak usług do wyświetlenia
              </div>
            ) : (
              services.map((service) => (
                <div key={service.id} className="border border-hanami-accent/20 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 bg-hanami-secondary rounded-full flex items-center justify-center">
                        <Settings className="h-8 w-8 text-hanami-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-hanami-primary text-lg">
                            {service.name}
                          </h3>
                          {service.category && (
                            <Badge variant="outline" className="text-xs">
                              {service.category}
                            </Badge>
                          )}
                        </div>
                        {service.description && (
                          <p className="text-sm text-hanami-neutral mb-2">
                            {service.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-hanami-neutral">
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {service.duration} min
                          </span>
                          <span className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            {service.price} zł
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={service.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {service.is_active ? "Aktywna" : "Nieaktywna"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditService(service)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleServiceStatus(service.id, service.is_active)}
                      >
                        {service.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteService(service.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <CreateServiceDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        categories={categories}
        onSuccess={() => {
          fetchServices();
          fetchCategories();
        }}
      />

      <EditServiceDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        service={selectedService}
        categories={categories}
        onSuccess={() => {
          fetchServices();
          fetchCategories();
        }}
      />
    </>
  );
};

export default ServicesManager;