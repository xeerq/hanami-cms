import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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

interface Page {
  id: string;
  slug: string;
  title: string;
  content: any;
  meta_description?: string;
  is_published: boolean;
}

interface EditPageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  page: Page | null;
}

const EditPageDialog = ({
  open,
  onOpenChange,
  onSuccess,
  page,
}: EditPageDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    slug: "",
    title: "",
    meta_description: "",
    is_published: true,
    hero_title: "",
    hero_subtitle: "",
    content_text: "",
  });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (page && open) {
      setFormData({
        slug: page.slug || "",
        title: page.title || "",
        meta_description: page.meta_description || "",
        is_published: page.is_published,
        hero_title: page.content?.hero?.title || "",
        hero_subtitle: page.content?.hero?.subtitle || "",
        content_text: page.content?.sections?.[0]?.content || "",
      });
    } else if (!page && open) {
      // New page
      setFormData({
        slug: "",
        title: "",
        meta_description: "",
        is_published: true,
        hero_title: "",
        hero_subtitle: "",
        content_text: "",
      });
    }
  }, [page, open]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.slug.trim()) {
      toast({
        title: "Błąd",
        description: "Tytuł i slug są wymagane",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const contentData = {
        hero: {
          title: formData.hero_title,
          subtitle: formData.hero_subtitle,
        },
        sections: [
          {
            type: "text",
            content: formData.content_text,
          },
        ],
      };

      const pageData = {
        slug: formData.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        title: formData.title.trim(),
        content: contentData,
        meta_description: formData.meta_description.trim() || null,
        is_published: formData.is_published,
        ...(page ? { updated_by: user?.id } : { created_by: user?.id }),
      };

      if (page) {
        // Update existing page
        const { error } = await supabase
          .from("pages")
          .update(pageData)
          .eq("id", page.id);

        if (error) throw error;

        toast({
          title: "Sukces",
          description: "Strona została zaktualizowana",
        });
      } else {
        // Create new page
        const { error } = await supabase
          .from("pages")
          .insert(pageData);

        if (error) throw error;

        toast({
          title: "Sukces",
          description: "Strona została utworzona",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving page:", error);
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zapisać strony",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {page ? "Edytuj stronę" : "Utwórz nową stronę"}
          </DialogTitle>
          <DialogDescription>
            {page ? "Zaktualizuj treść strony" : "Dodaj nową stronę do witryny"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Tytuł strony *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="Tytuł strony"
              required
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug">Adres URL (slug) *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => handleInputChange("slug", e.target.value)}
              placeholder="adres-url-strony"
              required
            />
            <p className="text-xs text-hanami-neutral">
              Adres URL strony (np. "o-nas" dla strony /o-nas)
            </p>
          </div>

          {/* Meta Description */}
          <div className="space-y-2">
            <Label htmlFor="meta_description">Opis meta (SEO)</Label>
            <Textarea
              id="meta_description"
              value={formData.meta_description}
              onChange={(e) => handleInputChange("meta_description", e.target.value)}
              placeholder="Krótki opis strony dla wyszukiwarek..."
              rows={2}
            />
          </div>

          {/* Hero Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Sekcja główna (Hero)</h3>
            
            <div className="space-y-2">
              <Label htmlFor="hero_title">Tytuł główny</Label>
              <Input
                id="hero_title"
                value={formData.hero_title}
                onChange={(e) => handleInputChange("hero_title", e.target.value)}
                placeholder="Główny tytuł na stronie"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hero_subtitle">Podtytuł</Label>
              <Input
                id="hero_subtitle"
                value={formData.hero_subtitle}
                onChange={(e) => handleInputChange("hero_subtitle", e.target.value)}
                placeholder="Podtytuł lub krótki opis"
              />
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content_text">Treść główna</Label>
            <Textarea
              id="content_text"
              value={formData.content_text}
              onChange={(e) => handleInputChange("content_text", e.target.value)}
              placeholder="Główna treść strony..."
              rows={8}
            />
          </div>

          {/* Published Status */}
          <div className="flex items-center space-x-2">
            <Switch
              id="is_published"
              checked={formData.is_published}
              onCheckedChange={(checked) => handleInputChange("is_published", checked)}
            />
            <Label htmlFor="is_published">Opublikowana</Label>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Zapisywanie..." : (page ? "Zaktualizuj" : "Utwórz")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditPageDialog;