import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface SiteSetting {
  id: string;
  key: string;
  value: any;
  description?: string;
}

interface EditSettingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  setting: SiteSetting | null;
}

const EditSettingDialog = ({
  open,
  onOpenChange,
  onSuccess,
  setting,
}: EditSettingDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (setting && open) {
      setFormData(setting.value || {});
    }
  }, [setting, open]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNestedInputChange = (parent: string, field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!setting) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("site_settings")
        .update({
          value: formData,
          updated_by: user?.id,
        })
        .eq("id", setting.id);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Ustawienia zostały zaktualizowane",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating setting:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować ustawień",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderSettingForm = () => {
    if (!setting) return null;

    switch (setting.key) {
      case "header":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Tytuł</Label>
              <Input
                id="title"
                value={formData.title || ""}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Nazwa firmy/salonu"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtitle">Podtytuł</Label>
              <Input
                id="subtitle"
                value={formData.subtitle || ""}
                onChange={(e) => handleInputChange("subtitle", e.target.value)}
                placeholder="Krótki opis działalności"
              />
            </div>
          </div>
        );

      case "footer":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company">Nazwa firmy</Label>
              <Input
                id="company"
                value={formData.company || ""}
                onChange={(e) => handleInputChange("company", e.target.value)}
                placeholder="Nazwa firmy"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adres</Label>
              <Textarea
                id="address"
                value={formData.address || ""}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Pełny adres firmy"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={formData.phone || ""}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="+48 123 456 789"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="kontakt@firma.pl"
              />
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Media społecznościowe</h4>
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  value={formData.social?.facebook || ""}
                  onChange={(e) => handleNestedInputChange("social", "facebook", e.target.value)}
                  placeholder="https://facebook.com/twoja-strona"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={formData.social?.instagram || ""}
                  onChange={(e) => handleNestedInputChange("social", "instagram", e.target.value)}
                  placeholder="https://instagram.com/twoja-strona"
                />
              </div>
            </div>
          </div>
        );

      case "contact":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Adres</Label>
              <Textarea
                id="address"
                value={formData.address || ""}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Pełny adres"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={formData.phone || ""}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="+48 123 456 789"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="kontakt@firma.pl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours">Godziny otwarcia</Label>
              <Textarea
                id="hours"
                value={formData.hours || ""}
                onChange={(e) => handleInputChange("hours", e.target.value)}
                placeholder="Pon-Pt: 9:00-18:00..."
                rows={3}
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <Label htmlFor="value">Wartość</Label>
            <Textarea
              id="value"
              value={JSON.stringify(formData, null, 2)}
              onChange={(e) => {
                try {
                  setFormData(JSON.parse(e.target.value));
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              placeholder="JSON value"
              rows={10}
            />
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edytuj ustawienia: {setting?.key?.replace('_', ' ')}
          </DialogTitle>
          <DialogDescription>
            {setting?.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {renderSettingForm()}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Zapisywanie..." : "Zapisz zmiany"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditSettingDialog;