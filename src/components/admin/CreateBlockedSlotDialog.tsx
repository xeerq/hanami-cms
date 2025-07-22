import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface CreateBlockedSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Therapist {
  id: string;
  name: string;
}

const CreateBlockedSlotDialog = ({ open, onOpenChange, onSuccess }: CreateBlockedSlotDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [formData, setFormData] = useState({
    therapist_id: "",
    blocked_date: "",
    start_time: "",
    end_time: "",
    reason: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchTherapists();
    }
  }, [open]);

  const fetchTherapists = async () => {
    try {
      const { data, error } = await supabase
        .from("therapists")
        .select("id, name")
        .eq("is_active", true)
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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from("blocked_slots")
        .insert({
          therapist_id: formData.therapist_id,
          blocked_date: formData.blocked_date,
          start_time: formData.start_time,
          end_time: formData.end_time,
          reason: formData.reason || null,
          created_by: user.id
        });

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Blokada została utworzona",
      });

      onSuccess();
      onOpenChange(false);
      setFormData({
        therapist_id: "",
        blocked_date: "",
        start_time: "",
        end_time: "",
        reason: ""
      });
    } catch (error: any) {
      console.error("Error creating blocked slot:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się utworzyć blokady",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dodaj blokadę terminu</DialogTitle>
          <DialogDescription>
            Zablokuj dostępność terapeuty w określonym czasie
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="therapist_id">Terapeuta</Label>
            <Select value={formData.therapist_id} onValueChange={(value) => setFormData({ ...formData, therapist_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz terapeutę" />
              </SelectTrigger>
              <SelectContent>
                {therapists.map((therapist) => (
                  <SelectItem key={therapist.id} value={therapist.id}>
                    {therapist.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="blocked_date">Data</Label>
            <Input
              id="blocked_date"
              type="date"
              value={formData.blocked_date}
              onChange={(e) => setFormData({ ...formData, blocked_date: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Godzina początkowa</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time">Godzina końcowa</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Powód blokady (opcjonalnie)</Label>
            <Textarea
              id="reason"
              placeholder="np. urlop, przerwa, szkolenie..."
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Tworzenie..." : "Utwórz blokadę"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBlockedSlotDialog;