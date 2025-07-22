import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateTherapistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CreateTherapistDialog = ({ open, onOpenChange, onSuccess }: CreateTherapistDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    specialization: "",
    experience: "",
    bio: ""
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("therapists")
        .insert({
          name: formData.name,
          specialization: formData.specialization || null,
          experience: formData.experience || null,
          bio: formData.bio || null,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Terapeuta został dodany",
      });

      onSuccess();
      onOpenChange(false);
      setFormData({
        name: "",
        specialization: "",
        experience: "",
        bio: ""
      });
    } catch (error: any) {
      console.error("Error creating therapist:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się dodać terapeuty",
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
          <DialogTitle>Dodaj nowego terapeutę</DialogTitle>
          <DialogDescription>
            Wprowadź dane nowego terapeuty
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Imię i nazwisko</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Jan Kowalski"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialization">Specjalizacja</Label>
            <Input
              id="specialization"
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              placeholder="np. Masaże relaksacyjne"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience">Doświadczenie</Label>
            <Input
              id="experience"
              value={formData.experience}
              onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
              placeholder="np. 5 lat doświadczenia"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Opis biograficzny</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Krótki opis terapeuty..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Dodawanie..." : "Dodaj terapeutę"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTherapistDialog;