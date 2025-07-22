import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Plus, Edit, Trash2, Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CreateBlockedSlotDialog from "./CreateBlockedSlotDialog";

interface BlockedSlot {
  id: string;
  blocked_date: string;
  start_time: string;
  end_time: string;
  reason?: string;
  therapists: { name: string };
}

const BlockedSlotsManager = () => {
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBlockedSlots();
  }, []);

  const fetchBlockedSlots = async () => {
    try {
      const { data, error } = await supabase
        .from("blocked_slots")
        .select(`
          *,
          therapists(name)
        `)
        .order("blocked_date", { ascending: false })
        .order("start_time", { ascending: true });

      if (error) throw error;
      setBlockedSlots(data || []);
    } catch (error: any) {
      console.error("Error fetching blocked slots:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować zablokowanych terminów",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteBlockedSlot = async (slotId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć tę blokadę?")) return;

    try {
      const { error } = await supabase
        .from("blocked_slots")
        .delete()
        .eq("id", slotId);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Blokada została usunięta",
      });

      fetchBlockedSlots();
    } catch (error: any) {
      console.error("Error deleting blocked slot:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć blokady",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Zarządzanie blokadami terminów</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hanami-primary mx-auto"></div>
            <p className="mt-2 text-hanami-neutral">Ładowanie blokad...</p>
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
              <CardTitle className="text-hanami-primary">Zarządzanie blokadami terminów</CardTitle>
              <CardDescription>
                Blokuj terminy z powodu urlopów, przerw lub innych okoliczności
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Dodaj blokadę
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {blockedSlots.length === 0 ? (
              <div className="text-center py-8 text-hanami-neutral">
                Brak zablokowanych terminów
              </div>
            ) : (
              blockedSlots.map((slot) => (
                <div key={slot.id} className="border border-hanami-accent/20 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-hanami-primary">
                          Blokada dla: {slot.therapists.name}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-hanami-neutral">
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(slot.blocked_date).toLocaleDateString('pl-PL')}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {slot.start_time} - {slot.end_time}
                          </span>
                        </div>
                        {slot.reason && (
                          <p className="text-sm text-hanami-neutral mt-2">
                            <strong>Powód:</strong> {slot.reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-red-100 text-red-800">
                        Zablokowane
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteBlockedSlot(slot.id)}
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

      <CreateBlockedSlotDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchBlockedSlots}
      />
    </>
  );
};

export default BlockedSlotsManager;