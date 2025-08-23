import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Package, TrendingDown, Edit3, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Product {
  id: string;
  name: string;
  stock_quantity: number;
  category: string;
  price: number;
  image_url?: string;
}

interface StockUpdate {
  productId: string;
  newStock: number;
}

const ProductInventoryManager = () => {
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newStockValue, setNewStockValue] = useState("");
  const { toast } = useToast();

  const LOW_STOCK_THRESHOLD = 5;

  useEffect(() => {
    fetchLowStockProducts();
  }, []);

  const fetchLowStockProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .lt("stock_quantity", LOW_STOCK_THRESHOLD)
        .order("stock_quantity", { ascending: true });

      if (error) throw error;
      setLowStockProducts(data || []);
    } catch (error: any) {
      console.error("Error fetching low stock products:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować produktów o niskim stanie",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = (product: Product) => {
    setSelectedProduct(product);
    setNewStockValue(product.stock_quantity.toString());
    setShowStockDialog(true);
  };

  const updateStock = async () => {
    if (!selectedProduct || !newStockValue) return;

    try {
      const { error } = await supabase
        .from("products")
        .update({ stock_quantity: parseInt(newStockValue) })
        .eq("id", selectedProduct.id);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: `Zaktualizowano stan magazynowy dla ${selectedProduct.name}`,
      });

      setShowStockDialog(false);
      fetchLowStockProducts();
    } catch (error: any) {
      console.error("Error updating stock:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować stanu magazynowego",
        variant: "destructive",
      });
    }
  };

  const getStockStatusColor = (stock: number) => {
    if (stock === 0) return "bg-red-100 text-red-800";
    if (stock <= 2) return "bg-orange-100 text-orange-800";
    return "bg-yellow-100 text-yellow-800";
  };

  const getStockStatusText = (stock: number) => {
    if (stock === 0) return "Brak w magazynie";
    if (stock <= 2) return "Krytycznie niski";
    return "Niski stan";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
            Alerty magazynowe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Sprawdzam stan magazynu...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
            Alerty magazynowe
          </CardTitle>
          <CardDescription>
            Produkty wymagające uzupełnienia stanu (poniżej {LOW_STOCK_THRESHOLD} sztuk)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lowStockProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Wszystkie produkty mają wystarczający stan magazynowy</p>
            </div>
          ) : (
            <div className="space-y-4">
              {lowStockProducts.map((product) => (
                <div key={product.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold">{product.name}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {product.category}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {product.price} zł
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <Badge className={getStockStatusColor(product.stock_quantity)}>
                          {getStockStatusText(product.stock_quantity)}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {product.stock_quantity} szt.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStock(product)}
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Uzupełnij
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showStockDialog} onOpenChange={setShowStockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uzupełnij stan magazynowy</DialogTitle>
            <DialogDescription>
              Zaktualizuj ilość produktu "{selectedProduct?.name}" w magazynie
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="stock">Nowa ilość w magazynie</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={newStockValue}
                onChange={(e) => setNewStockValue(e.target.value)}
                placeholder="Wprowadź nową ilość"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStockDialog(false)}>
              Anuluj
            </Button>
            <Button onClick={updateStock}>
              <Plus className="h-4 w-4 mr-2" />
              Zaktualizuj stan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProductInventoryManager;