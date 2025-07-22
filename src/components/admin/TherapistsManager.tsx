import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Plus, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CreateTherapistDialog from "./CreateTherapistDialog";

interface Therapist {
  id: string;
  name: string;
  specialization?: string;
  experience?: string;
  bio?: string;
  is_active: boolean;
}

const TherapistsManager = () => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTherapists();
  }, []);

  const fetchTherapists = async () => {
    try {
      const { data, error } = await supabase
        .from("therapists")
        .select("*")
        .order("name");

      if (error) throw error;
      setTherapists(data || []);
    } catch (error: any) {
      console.error("Error fetching therapists:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować terapeutów",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTherapistStatus = async (therapistId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("therapists")
        .update({ is_active: !isActive })
        .eq("id", therapistId);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: `Terapeuta został ${!isActive ? 'aktywowany' : 'dezaktywowany'}`,
      });

      fetchTherapists();
    } catch (error: any) {
      console.error("Error updating therapist:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować terapeuty",
        variant: "destructive",
      });
    }
  };

  const deleteTherapist = async (therapistId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć tego terapeutę? Ta operacja jest nieodwracalna.")) return;

    try {
      const { error } = await supabase
        .from("therapists")
        .delete()
        .eq("id", therapistId);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Terapeuta został usunięty",
      });

      fetchTherapists();
    } catch (error: any) {
      console.error("Error deleting therapist:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć terapeuty",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Zarządzanie terapeutami</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hanami-primary mx-auto"></div>
            <p className="mt-2 text-hanami-neutral">Ładowanie terapeutów...</p>
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
              <CardTitle className="text-hanami-primary">Zarządzanie terapeutami</CardTitle>
              <CardDescription>
                Dodawaj, edytuj i zarządzaj terapeutami
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Dodaj terapeutę
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {therapists.length === 0 ? (
              <div className="text-center py-8 text-hanami-neutral">
                Brak terapeutów do wyświetlenia
              </div>
            ) : (
              therapists.map((therapist) => (
                <div key={therapist.id} className="border border-hanami-accent/20 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 bg-hanami-secondary rounded-full flex items-center justify-center">
                        <User className="h-8 w-8 text-hanami-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-hanami-primary text-lg">
                          {therapist.name}
                        </h3>
                        {therapist.specialization && (
                          <p className="text-sm text-hanami-neutral mb-1">
                            <strong>Specjalizacja:</strong> {therapist.specialization}
                          </p>
                        )}
                        {therapist.experience && (
                          <p className="text-sm text-hanami-neutral mb-1">
                            <strong>Doświadczenie:</strong> {therapist.experience}
                          </p>
                        )}
                        {therapist.bio && (
                          <p className="text-sm text-hanami-neutral">
                            {therapist.bio}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={therapist.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {therapist.is_active ? "Aktywny" : "Nieaktywny"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleTherapistStatus(therapist.id, therapist.is_active)}
                      >
                        {therapist.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteTherapist(therapist.id)}
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

      <CreateTherapistDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchTherapists}
      />
    </>
  );
};

export default TherapistsManager;