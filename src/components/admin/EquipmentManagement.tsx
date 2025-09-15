import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Package, AlertCircle, CheckCircle, XCircle, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Equipment {
  id: string;
  name: string;
  description?: string;
  equipment_type: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  status: string;
  room_id?: string;
  purchase_date?: string;
  warranty_expires?: string;
  maintenance_schedule: any;
  created_at: string;
  updated_at: string;
}

interface Room {
  id: string;
  name: string;
  is_active: boolean;
}

export const EquipmentManagement = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    equipment_type: "",
    brand: "",
    model: "",
    serial_number: "",
    status: "active",
    room_id: "",
    purchase_date: "",
    warranty_expires: ""
  });

  const equipmentTypes = [
    "Stół do masażu",
    "Fotel do masażu", 
    "System muzyczny",
    "Klimatyzacja",
    "Podgrzewacz ręczników",
    "Oświetlenie",
    "Lustro",
    "Szafka",
    "Wózek narzędziowy",
    "Inne"
  ];

  const statusOptions = [
    { value: "active", label: "Aktywny", icon: CheckCircle, color: "text-green-600" },
    { value: "maintenance", label: "Konserwacja", icon: Wrench, color: "text-yellow-600" },
    { value: "damaged", label: "Uszkodzony", icon: AlertCircle, color: "text-red-600" },
    { value: "retired", label: "Wycofany", icon: XCircle, color: "text-gray-600" }
  ];

  useEffect(() => {
    Promise.all([fetchEquipment(), fetchRooms()]);
  }, []);

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from("equipment")
        .select(`
          *,
          rooms!equipment_room_id_fkey (
            id,
            name
          )
        `)
        .order("name");

      if (error) throw error;
      setEquipment(data || []);
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać listy sprzętu",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, name, is_active")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setRooms(data || []);
    } catch (error: any) {
      console.error("Error fetching rooms:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      equipment_type: "",
      brand: "",
      model: "",
      serial_number: "",
      status: "active",
      room_id: "",
      purchase_date: "",
      warranty_expires: ""
    });
    setSelectedEquipment(null);
    setIsEditMode(false);
  };

  const handleCreateEquipment = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEditEquipment = (item: Equipment) => {
    setFormData({
      name: item.name,
      description: item.description || "",
      equipment_type: item.equipment_type,
      brand: item.brand || "",
      model: item.model || "",
      serial_number: item.serial_number || "",
      status: item.status,
      room_id: item.room_id || "",
      purchase_date: item.purchase_date || "",
      warranty_expires: item.warranty_expires || ""
    });
    setSelectedEquipment(item);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleSaveEquipment = async () => {
    try {
      const dataToSave = {
        ...formData,
        room_id: formData.room_id || null,
        purchase_date: formData.purchase_date || null,
        warranty_expires: formData.warranty_expires || null
      };

      if (isEditMode && selectedEquipment) {
        const { error } = await supabase
          .from("equipment")
          .update(dataToSave)
          .eq("id", selectedEquipment.id);

        if (error) throw error;
        toast({
          title: "Sukces",
          description: "Sprzęt został zaktualizowany"
        });
      } else {
        const { error } = await supabase
          .from("equipment")
          .insert([dataToSave]);

        if (error) throw error;
        toast({
          title: "Sukces",
          description: "Sprzęt został dodany"
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchEquipment();
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zapisać sprzętu",
        variant: "destructive"
      });
    }
  };

  const handleDeleteEquipment = async (equipmentId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć ten sprzęt?")) return;

    try {
      const { error } = await supabase
        .from("equipment")
        .delete()
        .eq("id", equipmentId);

      if (error) throw error;
      
      toast({
        title: "Sukces",
        description: "Sprzęt został usunięty"
      });
      fetchEquipment();
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć sprzętu",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const option = statusOptions.find(opt => opt.value === status);
    if (!option) return null;
    
    const Icon = option.icon;
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${option.color}`} />
        {option.label}
      </Badge>
    );
  };

  const filteredEquipment = equipment.filter(item => {
    const statusMatch = filterStatus === "all" || item.status === filterStatus;
    const typeMatch = filterType === "all" || item.equipment_type === filterType;
    return statusMatch && typeMatch;
  });

  const groupedEquipment = rooms.reduce((acc, room) => {
    acc[room.id] = {
      room,
      equipment: filteredEquipment.filter(item => item.room_id === room.id)
    };
    return acc;
  }, {} as Record<string, { room: Room; equipment: Equipment[] }>);

  // Unassigned equipment
  const unassignedEquipment = filteredEquipment.filter(item => !item.room_id);

  if (loading) {
    return <div className="flex justify-center p-8">Ładowanie...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Zarządzanie sprzętem</h2>
          <p className="text-muted-foreground">
            Katalog i przypisanie sprzętu do pomieszczeń
          </p>
        </div>
        <Button onClick={handleCreateEquipment}>
          <Plus className="h-4 w-4 mr-2" />
          Dodaj sprzęt
        </Button>
      </div>

      <Tabs defaultValue="by-room" className="space-y-4">
        <TabsList>
          <TabsTrigger value="by-room">Według pomieszczeń</TabsTrigger>
          <TabsTrigger value="list">Lista sprzętu</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex gap-4">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie statusy</SelectItem>
              {statusOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Typ sprzętu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie typy</SelectItem>
              {equipmentTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="by-room" className="space-y-6">
          {/* Unassigned Equipment */}
          {unassignedEquipment.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <Package className="h-5 w-5" />
                  Sprzęt nieprzypisany
                </CardTitle>
                <CardDescription>
                  Sprzęt, który nie został jeszcze przypisany do żadnego pomieszczenia
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {unassignedEquipment.map((item) => (
                    <Card key={item.id} className="border-orange-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{item.name}</h4>
                          {getStatusBadge(item.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {item.equipment_type}
                        </p>
                        {(item.brand || item.model) && (
                          <p className="text-xs text-muted-foreground mb-2">
                            {[item.brand, item.model].filter(Boolean).join(" ")}
                          </p>
                        )}
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => handleEditEquipment(item)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDeleteEquipment(item.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Equipment by Room */}
          {Object.values(groupedEquipment).map(({ room, equipment: roomEquipment }) => (
            <Card key={room.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {room.name}
                </CardTitle>
                <CardDescription>
                  {roomEquipment.length} pozycji sprzętu
                </CardDescription>
              </CardHeader>
              <CardContent>
                {roomEquipment.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Brak sprzętu w tym pomieszczeniu
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {roomEquipment.map((item) => (
                      <Card key={item.id} className="border-muted">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{item.name}</h4>
                            {getStatusBadge(item.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {item.equipment_type}
                          </p>
                          {(item.brand || item.model) && (
                            <p className="text-xs text-muted-foreground mb-2">
                              {[item.brand, item.model].filter(Boolean).join(" ")}
                            </p>
                          )}
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => handleEditEquipment(item)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDeleteEquipment(item.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredEquipment.map((item) => (
              <Card key={item.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    {getStatusBadge(item.status)}
                  </div>
                  <CardDescription>{item.equipment_type}</CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {(item.brand || item.model) && (
                      <div className="text-muted-foreground">
                        {[item.brand, item.model].filter(Boolean).join(" ")}
                      </div>
                    )}
                    
                    {item.room_id && (
                      <div className="text-muted-foreground">
                        Pomieszczenie: {rooms.find(r => r.id === item.room_id)?.name || "Nieznane"}
                      </div>
                    )}
                    
                    {item.serial_number && (
                      <div className="text-xs text-muted-foreground">
                        S/N: {item.serial_number}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline" onClick={() => handleEditEquipment(item)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDeleteEquipment(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edytuj sprzęt" : "Dodaj nowy sprzęt"}
            </DialogTitle>
            <DialogDescription>
              Uzupełnij informacje o sprzęcie
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nazwa sprzętu</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="np. Stół do masażu Premium"
                />
              </div>
              <div>
                <Label htmlFor="equipment_type">Typ sprzętu</Label>
                <Select value={formData.equipment_type} onValueChange={(value) => setFormData(prev => ({ ...prev, equipment_type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz typ" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Opis</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Dodatkowe informacje o sprzęcie..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="brand">Marka</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                  placeholder="np. Earthlite"
                />
              </div>
              <div>
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                  placeholder="np. Spirit"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="serial_number">Numer seryjny</Label>
                <Input
                  id="serial_number"
                  value={formData.serial_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, serial_number: e.target.value }))}
                  placeholder="np. ES2024001"
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="room_id">Pomieszczenie</Label>
              <Select value={formData.room_id} onValueChange={(value) => setFormData(prev => ({ ...prev, room_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz pomieszczenie (opcjonalne)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nieprzypisane</SelectItem>
                  {rooms.map(room => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="purchase_date">Data zakupu</Label>
                <Input
                  id="purchase_date"
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, purchase_date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="warranty_expires">Koniec gwarancji</Label>
                <Input
                  id="warranty_expires"
                  type="date"
                  value={formData.warranty_expires}
                  onChange={(e) => setFormData(prev => ({ ...prev, warranty_expires: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSaveEquipment}>
              {isEditMode ? "Zapisz zmiany" : "Dodaj sprzęt"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};