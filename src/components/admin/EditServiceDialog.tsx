import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useActivityLogger } from "@/hooks/useActivityLogger";

interface Category {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  category?: string;
  is_active: boolean;
}

interface EditServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service | null;
  categories: Category[];
  onSuccess: () => void;
}

const EditServiceDialog = ({ open, onOpenChange, service, categories, onSuccess }: EditServiceDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration: "",
    price: "",
    category: "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();

  useEffect(() => {
    if (service && open) {
      setFormData({
        name: service.name,
        description: service.description || "",
        duration: service.duration.toString(),
        price: service.price.toString(),
        category: service.category || "",
      });
    } else if (!open) {
      // Reset form when dialog closes
      setFormData({
        name: "",
        description: "",
        duration: "",
        price: "",
        category: "",
      });
    }
  }, [service, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service) return;

    setLoading(true);

    try {
      // Zapisz oryginalne wartości do porównania
      const originalData = {
        name: service.name,
        description: service.description,
        duration: service.duration,
        price: service.price,
        category: service.category,
      };

      const newData = {
        name: formData.name,
        description: formData.description || null,
        duration: parseInt(formData.duration),
        price: parseFloat(formData.price),
        category: formData.category || null,
      };

      const { error } = await supabase
        .from("services")
        .update(newData)
        .eq("id", service.id);

      if (error) throw error;

      // Loguj zmiany w usłudze
      const changes: Record<string, { from: any; to: any }> = {};
      if (originalData.name !== newData.name) changes.name = { from: originalData.name, to: newData.name };
      if (originalData.description !== newData.description) changes.description = { from: originalData.description, to: newData.description };
      if (originalData.duration !== newData.duration) changes.duration = { from: originalData.duration, to: newData.duration };
      if (originalData.price !== newData.price) changes.price = { from: originalData.price, to: newData.price };
      if (originalData.category !== newData.category) changes.category = { from: originalData.category, to: newData.category };

      if (Object.keys(changes).length > 0) {
        await logActivity({
          action: 'service_updated',
          tableName: 'services',
          recordId: service.id,
          details: {
            service_name: service.name,
            changes: changes
          }
        });
      }

      toast({
        title: "Sukces",
        description: "Usługa została zaktualizowana",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating service:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować usługi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edytuj usługę</DialogTitle>
          <DialogDescription>
            Zaktualizuj informacje o usłudze
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nazwa usługi</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Opis</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Opisz usługę..."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="duration">Czas trwania (minuty)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="price">Cena (zł)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Kategoria</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz kategorię" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Zapisywanie..." : "Zapisz zmiany"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditServiceDialog;