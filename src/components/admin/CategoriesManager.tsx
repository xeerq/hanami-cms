import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tag, Plus, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CreateCategoryDialog from "./CreateCategoryDialog";
import EditCategoryDialog from "./EditCategoryDialog";

interface Category {
  id: string;
  name: string;
  type: 'product' | 'service';
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const CategoriesManager = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [createType, setCreateType] = useState<'product' | 'service'>('product');
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("type")
        .order("name");

      if (error) throw error;
      setCategories((data || []) as Category[]);
    } catch (error: any) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować kategorii",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setShowEditDialog(true);
  };

  const toggleCategoryStatus = async (categoryId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("categories")
        .update({ is_active: !isActive })
        .eq("id", categoryId);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: `Kategoria została ${!isActive ? 'aktywowana' : 'dezaktywowana'}`,
      });

      fetchCategories();
    } catch (error: any) {
      console.error("Error updating category:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować kategorii",
        variant: "destructive",
      });
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć tę kategorię? Ta operacja jest nieodwracalna.")) return;

    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", categoryId);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Kategoria została usunięta",
      });

      fetchCategories();
    } catch (error: any) {
      console.error("Error deleting category:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć kategorii",
        variant: "destructive",
      });
    }
  };

  const handleCreateCategory = (type: 'product' | 'service') => {
    setCreateType(type);
    setShowCreateDialog(true);
  };

  const productCategories = categories.filter(cat => cat.type === 'product');
  const serviceCategories = categories.filter(cat => cat.type === 'service');

  const renderCategoryList = (categoriesList: Category[], type: 'product' | 'service') => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-hanami-primary">
          {type === 'product' ? 'Kategorie produktów' : 'Kategorie usług'}
        </h3>
        <Button onClick={() => handleCreateCategory(type)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Dodaj kategorię
        </Button>
      </div>
      
      {categoriesList.length === 0 ? (
        <div className="text-center py-8 text-hanami-neutral">
          Brak kategorii do wyświetlenia
        </div>
      ) : (
        categoriesList.map((category) => (
          <div key={category.id} className="border border-hanami-accent/20 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-hanami-secondary rounded-full flex items-center justify-center">
                  <Tag className="h-6 w-6 text-hanami-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-semibold text-hanami-primary">
                      {category.name}
                    </h4>
                  </div>
                  {category.description && (
                    <p className="text-sm text-hanami-neutral">
                      {category.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={category.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                  {category.is_active ? "Aktywna" : "Nieaktywna"}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditCategory(category)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleCategoryStatus(category.id, category.is_active)}
                >
                  {category.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteCategory(category.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Zarządzanie kategoriami</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hanami-primary mx-auto"></div>
            <p className="mt-2 text-hanami-neutral">Ładowanie kategorii...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-hanami-primary">Zarządzanie kategoriami</CardTitle>
          <CardDescription>
            Dodawaj, edytuj i zarządzaj kategoriami produktów i usług
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="products" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="products">Produkty</TabsTrigger>
              <TabsTrigger value="services">Usługi</TabsTrigger>
            </TabsList>
            <TabsContent value="products">
              {renderCategoryList(productCategories, 'product')}
            </TabsContent>
            <TabsContent value="services">
              {renderCategoryList(serviceCategories, 'service')}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <CreateCategoryDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        type={createType}
        onSuccess={fetchCategories}
      />

      <EditCategoryDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        category={selectedCategory}
        onSuccess={fetchCategories}
      />
    </>
  );
};

export default CategoriesManager;