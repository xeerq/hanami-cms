import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Package, Calendar, MapPin } from "lucide-react";
import { RoomManagement } from "./RoomManagement";
import { EquipmentManagement } from "./EquipmentManagement";
import { RoomBookingSystem } from "./RoomBookingSystem";
import { ServiceRoomAssignments } from "./ServiceRoomAssignments";

export const SpaFacilityManager = () => {
  const [activeTab, setActiveTab] = useState("rooms");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Building className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Zarządzanie obiektami SPA</h1>
          <p className="text-muted-foreground">
            Kompleksowy system zarządzania pomieszczeniami, sprzętem i rezerwacjami
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="rooms" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Pomieszczenia
          </TabsTrigger>
          <TabsTrigger value="equipment" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Sprzęt
          </TabsTrigger>
          <TabsTrigger value="bookings" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Rezerwacje
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Przypisania
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rooms">
          <RoomManagement />
        </TabsContent>

        <TabsContent value="equipment">
          <EquipmentManagement />
        </TabsContent>

        <TabsContent value="bookings">
          <RoomBookingSystem />
        </TabsContent>

        <TabsContent value="assignments">
          <ServiceRoomAssignments />
        </TabsContent>
      </Tabs>
    </div>
  );
};