
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
import ImageUploadCrop from "@/components/ui/image-upload-crop";

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock_quantity?: number;
  category?: string;
  image_url?: string;
  is_active: boolean;
}

interface EditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  categories: Category[];
  onSuccess: () => void;
}

const EditProductDialog = ({ open, onOpenChange, product, categories, onSuccess }: EditProductDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    stock_quantity: "",
    category: "",
    image_url: "",
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();

  useEffect(() => {
    console.log("EditProductDialog useEffect:", { product, open });
    if (product && open) {
      console.log("Setting form data:", product);
      const formData = {
        name: product.name,
        description: product.description || "",
        price: product.price.toString(),
        stock_quantity: product.stock_quantity?.toString() || "",
        category: product.category || "",
        image_url: product.image_url || "",
      };
      console.log("Form data being set:", formData);
      setFormData(formData);
    } else if (!open) {
      // Reset form when dialog closes
      setFormData({
        name: "",
        description: "",
        price: "",
        stock_quantity: "",
        category: "",
        image_url: "",
      });
    }
  }, [product, open]);

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `products/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('product-service-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product-service-images')
        .getPublicUrl(fileName);

      setFormData({ ...formData, image_url: data.publicUrl });
      
      toast({
        title: "Sukces",
        description: "Zdjęcie zostało przesłane",
      });
    } catch (error: any) {
      console.error("Error uploading image:", error);
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
    if (!product) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from("products")
        .update({
          name: formData.name,
          description: formData.description || null,
          price: parseFloat(formData.price),
          stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : null,
          category: formData.category || null,
          image_url: formData.image_url || null,
        })
        .eq("id", product.id);

      if (error) throw error;

      // Loguj edycję produktu 
      const changes: Record<string, { from: any; to: any }> = {};
      if (product.name !== formData.name) changes.name = { from: product.name, to: formData.name };
      if (product.description !== formData.description) changes.description = { from: product.description, to: formData.description };
      if (product.price !== parseFloat(formData.price)) changes.price = { from: product.price, to: parseFloat(formData.price) };
      if (product.stock_quantity !== parseInt(formData.stock_quantity)) changes.stock_quantity = { from: product.stock_quantity, to: parseInt(formData.stock_quantity) };
      if (product.category !== formData.category) changes.category = { from: product.category, to: formData.category };

      if (Object.keys(changes).length > 0) {
        await logActivity({
          action: 'product_updated',
          tableName: 'products',
          recordId: product.id,
          details: {
            product_name: product.name,
            changes: changes
          }
        });
      }

      toast({
        title: "Sukces",
        description: "Produkt został zaktualizowany",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating product:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować produktu",
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
          <DialogTitle>Edytuj produkt</DialogTitle>
          <DialogDescription>
            Zaktualizuj informacje o produkcie
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nazwa produktu</Label>
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
                placeholder="Opisz produkt..."
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
              <Label htmlFor="stock_quantity">Ilość w magazynie</Label>
              <Input
                id="stock_quantity"
                type="number"
                min="0"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                placeholder="Opcjonalne"
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

            <ImageUploadCrop
              onImageUpload={handleImageUpload}
              currentImageUrl={formData.image_url}
              aspectRatio={4/3}
              label="Zdjęcie produktu"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {loading ? "Zapisywanie..." : uploading ? "Przesyłanie..." : "Zapisz zmiany"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProductDialog;
