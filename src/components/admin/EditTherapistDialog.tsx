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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Therapist {
  id: string;
  name: string;
  specialization?: string;
  experience?: string;
  bio?: string;
  avatar_url?: string;
  is_active: boolean;
  user_id?: string;
}

interface EditTherapistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  therapist: Therapist | null;
}

const EditTherapistDialog = ({
  open,
  onOpenChange,
  onSuccess,
  therapist,
}: EditTherapistDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    specialization: "",
    experience: "",
    bio: "",
    avatar_url: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (therapist && open) {
      setFormData({
        name: therapist.name || "",
        specialization: therapist.specialization || "",
        experience: therapist.experience || "",
        bio: therapist.bio || "",
        avatar_url: therapist.avatar_url || "",
      });
    }
  }, [therapist, open]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !therapist) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Błąd",
        description: "Można przesłać tylko pliki graficzne",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Błąd",
        description: "Plik jest zbyt duży. Maksymalny rozmiar to 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${therapist.id}.${fileExt}`;
      const filePath = `${fileName}`;

      // Remove old avatar if exists
      if (therapist.avatar_url) {
        const oldPath = therapist.avatar_url.split('/').pop();
        if (oldPath && oldPath !== fileName) {
          await supabase.storage
            .from('therapist-avatars')
            .remove([oldPath]);
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('therapist-avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('therapist-avatars')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        avatar_url: urlData.publicUrl,
      }));

      toast({
        title: "Sukces",
        description: "Zdjęcie zostało przesłane",
      });
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się przesłać zdjęcia",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!therapist) return;

    if (!formData.name.trim()) {
      toast({
        title: "Błąd",
        description: "Nazwa terapeuty jest wymagana",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("therapists")
        .update({
          name: formData.name.trim(),
          specialization: formData.specialization.trim() || null,
          experience: formData.experience.trim() || null,
          bio: formData.bio.trim() || null,
          avatar_url: formData.avatar_url || null,
        })
        .eq("id", therapist.id);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Terapeuta został zaktualizowany",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating therapist:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować terapeuty",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getAvatarFallback = () => {
    if (formData.name) {
      return formData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    return <User className="h-6 w-6" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edytuj terapeutę</DialogTitle>
          <DialogDescription>
            Zaktualizuj informacje o terapeucie, w tym zdjęcie profilowe i opis.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={formData.avatar_url} alt={formData.name} />
              <AvatarFallback className="text-lg bg-hanami-secondary text-hanami-primary">
                {getAvatarFallback()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => document.getElementById('avatar-upload')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Przesyłanie..." : "Zmień zdjęcie"}
              </Button>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Imię i nazwisko *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Jan Kowalski"
              required
            />
          </div>

          {/* Specialization */}
          <div className="space-y-2">
            <Label htmlFor="specialization">Specjalizacja</Label>
            <Input
              id="specialization"
              value={formData.specialization}
              onChange={(e) => handleInputChange("specialization", e.target.value)}
              placeholder="Masaż relaksacyjny, terapeutyczny..."
            />
          </div>

          {/* Experience */}
          <div className="space-y-2">
            <Label htmlFor="experience">Doświadczenie</Label>
            <Input
              id="experience"
              value={formData.experience}
              onChange={(e) => handleInputChange("experience", e.target.value)}
              placeholder="5 lat doświadczenia..."
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Opis</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange("bio", e.target.value)}
              placeholder="Krótki opis terapeuty, jego podejścia do masażu..."
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {loading ? "Zapisywanie..." : "Zapisz zmiany"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTherapistDialog;