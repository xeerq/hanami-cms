import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Home, Users, Square, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RoomLayoutEditor } from "./RoomLayoutEditor";

interface Room {
  id: string;
  name: string;
  description?: string;
  capacity: number;
  floor_area?: number;
  floor_plan_data: any;
  amenities?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const RoomManagement = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    capacity: 1,
    floor_area: 0,
    amenities: [] as string[],
    is_active: true,
    floor_plan_data: {}
  });

  const availableAmenities = [
    "Prysznic", "Muzyka", "Klimatyzacja", "Przechowywanie", 
    "Podgrzewane łóżko", "Okno", "Lustro", "Szafka na ręczniki"
  ];

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .order("name");

      if (error) throw error;
      setRooms(data || []);
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać listy pomieszczeń",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      capacity: 1,
      floor_area: 0,
      amenities: [],
      is_active: true,
      floor_plan_data: {}
    });
    setSelectedRoom(null);
    setIsEditMode(false);
  };

  const handleCreateRoom = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEditRoom = (room: Room) => {
    setFormData({
      name: room.name,
      description: room.description || "",
      capacity: room.capacity,
      floor_area: room.floor_area || 0,
      amenities: room.amenities || [],
      is_active: room.is_active,
      floor_plan_data: room.floor_plan_data || {}
    });
    setSelectedRoom(room);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleSaveRoom = async () => {
    try {
      if (isEditMode && selectedRoom) {
        const { error } = await supabase
          .from("rooms")
          .update(formData)
          .eq("id", selectedRoom.id);

        if (error) throw error;
        toast({
          title: "Sukces",
          description: "Pomieszczenie zostało zaktualizowane"
        });
      } else {
        const { error } = await supabase
          .from("rooms")
          .insert([formData]);

        if (error) throw error;
        toast({
          title: "Sukces",
          description: "Pomieszczenie zostało utworzone"
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchRooms();
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zapisać pomieszczenia",
        variant: "destructive"
      });
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć to pomieszczenie?")) return;

    try {
      const { error } = await supabase
        .from("rooms")
        .delete()
        .eq("id", roomId);

      if (error) throw error;
      
      toast({
        title: "Sukces",
        description: "Pomieszczenie zostało usunięte"
      });
      fetchRooms();
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć pomieszczenia",
        variant: "destructive"
      });
    }
  };

  const toggleAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  if (loading) {
    return <div className="flex justify-center p-8">Ładowanie...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Zarządzanie pomieszczeniami</h2>
          <p className="text-muted-foreground">
            Twórz i zarządzaj pomieszczeniami SPA
          </p>
        </div>
        <Button onClick={handleCreateRoom}>
          <Plus className="h-4 w-4 mr-2" />
          Dodaj pomieszczenie
        </Button>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Lista pomieszczeń</TabsTrigger>
          <TabsTrigger value="layout">Plan pomieszczeń</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <Card key={room.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      {room.name}
                    </CardTitle>
                    <Badge variant={room.is_active ? "default" : "secondary"}>
                      {room.is_active ? "Aktywne" : "Nieaktywne"}
                    </Badge>
                  </div>
                  {room.description && (
                    <CardDescription>{room.description}</CardDescription>
                  )}
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      Pojemność: {room.capacity} osób
                    </div>
                    {room.floor_area && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Square className="h-4 w-4" />
                        Powierzchnia: {room.floor_area} m²
                      </div>
                    )}
                    {room.amenities && room.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {room.amenities.map((amenity, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEditRoom(room)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDeleteRoom(room.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="layout">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Plan pomieszczeń
              </CardTitle>
              <CardDescription>
                Wizualna reprezentacja rozmieszczenia pomieszczeń
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RoomLayoutEditor rooms={rooms} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edytuj pomieszczenie" : "Dodaj nowe pomieszczenie"}
            </DialogTitle>
            <DialogDescription>
              Uzupełnij dane pomieszczenia SPA
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nazwa pomieszczenia</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="np. Gabinet masażu 1"
                />
              </div>
              <div>
                <Label htmlFor="capacity">Pojemność (osoby)</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Opis</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Dodatkowe informacje o pomieszczeniu..."
              />
            </div>

            <div>
              <Label htmlFor="floor_area">Powierzchnia (m²)</Label>
              <Input
                id="floor_area"
                type="number"
                step="0.1"
                min="0"
                value={formData.floor_area}
                onChange={(e) => setFormData(prev => ({ ...prev, floor_area: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            <div>
              <Label>Udogodnienia</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {availableAmenities.map((amenity) => (
                  <div key={amenity} className="flex items-center space-x-2">
                    <Switch
                      checked={formData.amenities.includes(amenity)}
                      onCheckedChange={() => toggleAmenity(amenity)}
                    />
                    <Label className="text-sm">{amenity}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label>Pomieszczenie aktywne</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSaveRoom}>
              {isEditMode ? "Zapisz zmiany" : "Utwórz pomieszczenie"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};