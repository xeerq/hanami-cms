import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Settings, Star, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  is_active: boolean;
}

interface Room {
  id: string;
  name: string;
  capacity: number;
  amenities: string[];
  is_active: boolean;
}

interface ServiceRoomRequirement {
  id: string;
  service_id: string;
  room_id: string;
  is_preferred: boolean;
}

export const ServiceRoomAssignments = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [requirements, setRequirements] = useState<ServiceRoomRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([fetchServices(), fetchRooms(), fetchRequirements()]);
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
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać usług",
        variant: "destructive"
      });
    }
  };

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setRooms(data || []);
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać pomieszczeń",
        variant: "destructive"
      });
    }
  };

  const fetchRequirements = async () => {
    try {
      const { data, error } = await supabase
        .from("service_room_requirements")
        .select("*");

      if (error) throw error;
      setRequirements(data || []);
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać przypisań",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getServiceRequirements = (serviceId: string) => {
    return requirements.filter(req => req.service_id === serviceId);
  };

  const getRequirement = (serviceId: string, roomId: string) => {
    return requirements.find(req => req.service_id === serviceId && req.room_id === roomId);
  };

  const handleRoomToggle = async (serviceId: string, roomId: string, assigned: boolean) => {
    try {
      if (assigned) {
        // Remove assignment
        const requirement = getRequirement(serviceId, roomId);
        if (requirement) {
          const { error } = await supabase
            .from("service_room_requirements")
            .delete()
            .eq("id", requirement.id);

          if (error) throw error;
        }
      } else {
        // Add assignment
        const { error } = await supabase
          .from("service_room_requirements")
          .insert({
            service_id: serviceId,
            room_id: roomId,
            is_preferred: false
          });

        if (error) throw error;
      }

      fetchRequirements();
      toast({
        title: "Sukces",
        description: assigned ? "Przypisanie zostało usunięte" : "Pomieszczenie zostało przypisane"
      });
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować przypisania",
        variant: "destructive"
      });
    }
  };

  const handlePreferredToggle = async (serviceId: string, roomId: string, isPreferred: boolean) => {
    try {
      const requirement = getRequirement(serviceId, roomId);
      if (!requirement) return;

      const { error } = await supabase
        .from("service_room_requirements")
        .update({ is_preferred: isPreferred })
        .eq("id", requirement.id);

      if (error) throw error;

      fetchRequirements();
      toast({
        title: "Sukces",
        description: isPreferred ? "Pomieszczenie oznaczono jako preferowane" : "Usunięto preferencję pomieszczenia"
      });
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować preferencji",
        variant: "destructive"
      });
    }
  };

  const openServiceDialog = (service: Service) => {
    setSelectedService(service);
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Ładowanie...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Przypisania usług do pomieszczeń</h2>
        <p className="text-muted-foreground">
          Określ, które pomieszczenia są odpowiednie dla każdej usługi
        </p>
      </div>

      <div className="grid gap-4">
        {services.map((service) => {
          const serviceReqs = getServiceRequirements(service.id);
          const assignedRooms = serviceReqs.length;
          const preferredRooms = serviceReqs.filter(req => req.is_preferred).length;

          return (
            <Card key={service.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {service.name}
                      <Badge variant="outline">
                        {service.duration} min
                      </Badge>
                      <Badge variant="secondary">
                        {service.price} zł
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {assignedRooms} przypisanych pomieszczeń
                      {preferredRooms > 0 && `, ${preferredRooms} preferowanych`}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openServiceDialog(service)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Zarządzaj
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                {assignedRooms === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>Brak przypisanych pomieszczeń</p>
                    <p className="text-sm">Usługa może być wykonana w dowolnym pomieszczeniu</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {serviceReqs.map((req) => {
                      const room = rooms.find(r => r.id === req.room_id);
                      if (!room) return null;

                      return (
                        <Badge
                          key={req.id}
                          variant={req.is_preferred ? "default" : "outline"}
                          className="flex items-center gap-1"
                        >
                          {req.is_preferred && <Star className="h-3 w-3" />}
                          {room.name}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Zarządzaj pomieszczeniami dla: {selectedService?.name}
            </DialogTitle>
            <DialogDescription>
              Wybierz pomieszczenia odpowiednie dla tej usługi i oznacz preferowane
            </DialogDescription>
          </DialogHeader>

          {selectedService && (
            <div className="space-y-4">
              <div className="grid gap-4">
                {rooms.map((room) => {
                  const requirement = getRequirement(selectedService.id, room.id);
                  const isAssigned = !!requirement;
                  const isPreferred = requirement?.is_preferred || false;

                  return (
                    <Card key={room.id} className={isAssigned ? "ring-2 ring-primary/20" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{room.name}</h4>
                              <Badge variant="outline">
                                {room.capacity} osób
                              </Badge>
                              {isPreferred && (
                                <Badge className="flex items-center gap-1">
                                  <Star className="h-3 w-3" />
                                  Preferowane
                                </Badge>
                              )}
                            </div>
                            {room.amenities && room.amenities.length > 0 && (
                              <p className="text-sm text-muted-foreground">
                                {room.amenities.join(", ")}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {isAssigned && (
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`preferred-${room.id}`} className="text-sm">
                                  Preferowane
                                </Label>
                                <Switch
                                  id={`preferred-${room.id}`}
                                  checked={isPreferred}
                                  onCheckedChange={(checked) => 
                                    handlePreferredToggle(selectedService.id, room.id, checked)
                                  }
                                />
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`assign-${room.id}`} className="text-sm">
                                Przypisane
                              </Label>
                              <Switch
                                id={`assign-${room.id}`}
                                checked={isAssigned}
                                onCheckedChange={(checked) => 
                                  handleRoomToggle(selectedService.id, room.id, !checked)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Zamknij
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};