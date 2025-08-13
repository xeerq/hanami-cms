
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Edit, Trash2, CheckCircle, XCircle, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CreateProductDialog from "./CreateProductDialog";
import EditProductDialog from "./EditProductDialog";
import { usePagination, usePaginatedData } from "@/hooks/usePagination";
import { PaginationControlsComponent } from "@/components/ui/pagination-controls";

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

interface Category {
  id: string;
  name: string;
}

const ProductsManager = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { toast } = useToast();
  
  const pagination = usePagination(products.length, 12);
  const paginatedProducts = usePaginatedData(products, pagination);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("type", "product")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error("Error fetching categories:", error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("category")
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować produktów",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    console.log("Edit product clicked:", product);
    setSelectedProduct(product);
    setShowEditDialog(true);
  };

  const toggleProductStatus = async (productId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_active: !isActive })
        .eq("id", productId);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: `Produkt został ${!isActive ? 'aktywowany' : 'dezaktywowany'}`,
      });

      fetchProducts();
    } catch (error: any) {
      console.error("Error updating product:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować produktu",
        variant: "destructive",
      });
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć ten produkt? Ta operacja jest nieodwracalna.")) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Produkt został usunięty",
      });

      fetchProducts();
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć produktu",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Zarządzanie produktami</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hanami-primary mx-auto"></div>
            <p className="mt-2 text-hanami-neutral">Ładowanie produktów...</p>
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
              <CardTitle className="text-hanami-primary">Zarządzanie produktami</CardTitle>
              <CardDescription>
                Dodawaj, edytuj i zarządzaj produktami w sklepie
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Dodaj produkt
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {products.length === 0 ? (
              <div className="text-center py-8 text-hanami-neutral">
                Brak produktów do wyświetlenia
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {paginatedProducts.map((product) => (
                    <div key={product.id} className="border border-hanami-accent/20 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-16 h-16 bg-hanami-secondary rounded-full flex items-center justify-center">
                            <Package className="h-8 w-8 text-hanami-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-semibold text-hanami-primary text-lg">
                                {product.name}
                              </h3>
                              {product.category && (
                                <Badge variant="outline" className="text-xs">
                                  {product.category}
                                </Badge>
                              )}
                            </div>
                            {product.description && (
                              <p className="text-sm text-hanami-neutral mb-2">
                                {product.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-4 text-sm text-hanami-neutral">
                              <span className="flex items-center">
                                <DollarSign className="h-4 w-4 mr-1" />
                                {product.price} zł
                              </span>
                              {product.stock_quantity !== null && (
                                <span>
                                  Stan: {product.stock_quantity} szt.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={product.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {product.is_active ? "Aktywny" : "Nieaktywny"}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditProduct(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleProductStatus(product.id, product.is_active)}
                          >
                            {product.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteProduct(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {products.length > 0 && (
                  <div className="border-t pt-4">
                    <PaginationControlsComponent
                      pagination={pagination}
                      totalItems={products.length}
                      pageSizeOptions={[6, 12, 24, 48]}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <CreateProductDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        categories={categories}
        onSuccess={() => {
          fetchProducts();
          fetchCategories();
        }}
      />

      <EditProductDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        product={selectedProduct}
        categories={categories}
        onSuccess={() => {
          fetchProducts();
          fetchCategories();
        }}
      />
    </>
  );
};

export default ProductsManager;
