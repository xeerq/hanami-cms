import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Heart, Plus, Minus, Gift, X } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Shop = () => {
  const [cart, setCart] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();


  const categories = ["Wszystkie", "Olejki", "Kosmetyki", "Akcesoria", "Aromaterapia", "Bony"];
  const [selectedCategory, setSelectedCategory] = useState("Wszystkie");

  useEffect(() => {
    loadServices();
    loadProducts();
  }, []);

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      const formattedProducts = (data || []).map(product => ({
        ...product,
        inStock: (product.stock_quantity || 0) > 0,
        image: product.image_url || "/lovable-uploads/6abfd03e-faab-45ef-8c3f-8eb2cf6b0ea7.png"
      }));
      
      setProducts(formattedProducts);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const vouchers = [
    {
      id: 'voucher-1',
      name: "Bon na masaż relaksacyjny",
      description: "Voucher na jeden masaż relaksacyjny w naszym spa",
      price: 200,
      category: "Bony",
      image: "/lovable-uploads/6abfd03e-faab-45ef-8c3f-8eb2cf6b0ea7.png",
      inStock: true,
      type: 'single',
      service_id: services.find(s => s.name.toLowerCase().includes('relaksacyjny'))?.id
    },
    {
      id: 'voucher-2',
      name: "Pakiet 3 masaży",
      description: "Pakiet 3 masaży do wykorzystania w ciągu 6 miesięcy",
      price: 500,
      category: "Bony",
      image: "/lovable-uploads/3140ba04-33e9-4565-bb1c-d1c585d11e13.png",
      inStock: true,
      type: 'package',
      sessions: 3
    },
    {
      id: 'voucher-3',
      name: "Bon podarunkowy 300zł",
      description: "Bon podarunkowy o wartości 300zł na dowolne usługi",
      price: 300,
      category: "Bony",
      image: "/lovable-uploads/36929f8b-ac5b-4aed-9ac9-ad38a48028a6.png",
      inStock: true,
      type: 'single',
      value: 300
    }
  ];

  const allProducts = [...products, ...vouchers];

  const filteredProducts = selectedCategory === "Wszystkie" 
    ? allProducts 
    : allProducts.filter(product => product.category === selectedCategory);

  const addToCart = (product: any) => {
    const cartItem = { ...product, cartId: Date.now() + Math.random() };
    setCart([...cart, cartItem]);
    toast({
      title: "Dodano do koszyka",
      description: `${product.name} został dodany do koszyka`,
    });
  };

  const removeFromCart = (cartId: string) => {
    setCart(cart.filter(item => item.cartId !== cartId));
    toast({
      title: "Usunięto z koszyka",
      description: "Produkt został usunięty z koszyka",
    });
  };

  const proceedToCheckout = () => {
    if (!user) {
      toast({
        title: "Wymagane logowanie",
        description: "Musisz być zalogowany, aby przejść do kasy",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    if (cart.length === 0) {
      toast({
        title: "Pusty koszyk",
        description: "Dodaj produkty do koszyka przed przejściem do kasy",
        variant: "destructive",
      });
      return;
    }

    // For now, just show a success message since we don't have a checkout page
    toast({
      title: "Przejście do kasy",
      description: "Funkcjonalność kasy będzie dostępna wkrótce",
    });
  };

  const purchaseVoucher = async (voucher: any) => {
    if (!user) {
      toast({
        title: "Wymagane logowanie",
        description: "Musisz być zalogowany, aby kupić bon",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Generuj kod bonu
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_voucher_code');

      if (codeError) throw codeError;

      const voucherData = {
        code: codeData,
        voucher_type: voucher.type,
        user_id: user.id,
        service_id: voucher.service_id || null,
        original_value: voucher.type === 'single' && voucher.value ? voucher.value : null,
        remaining_value: voucher.type === 'single' && voucher.value ? voucher.value : null,
        original_sessions: voucher.type === 'package' ? voucher.sessions : 1,
        remaining_sessions: voucher.type === 'package' ? voucher.sessions : 1,
        status: 'active',
        created_by: user.id
      };

      const { error } = await supabase
        .from('vouchers')
        .insert(voucherData);

      if (error) throw error;

      toast({
        title: "Bon zakupiony!",
        description: `Bon został dodany do Twojego konta. Kod: ${codeData}`,
      });

    } catch (error: any) {
      console.error('Error purchasing voucher:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zakupić bonu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCartItemCount = () => {
    return cart.length;
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-hanami text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-5xl font-light mb-6">Sklep Hanami</h1>
              <p className="text-xl max-w-3xl text-white/90">
                Odkryj naszą kolekcję premium produktów do spa i masażu
              </p>
            </div>
            <div className="hidden md:block">
              <Button 
                variant="secondary" 
                size="lg"
                onClick={() => setShowCart(!showCart)}
                className="relative"
              >
                <ShoppingBag className="h-5 w-5 mr-2" />
                Koszyk ({getCartItemCount()})
                {getCartItemCount() > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                    {getCartItemCount()}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Shop Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Category Filters */}
          <div className="flex justify-center mb-12">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge 
                  key={category} 
                  variant={selectedCategory === category ? "default" : "outline"}
                  className="cursor-pointer hover:bg-hanami-secondary transition-zen px-4 py-2"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="group hover:shadow-elegant transition-zen border-hanami-accent/20 overflow-hidden">
                <div className="relative">
                   <img 
                    src={product.image_url || product.image || "/lovable-uploads/6abfd03e-faab-45ef-8c3f-8eb2cf6b0ea7.png"} 
                    alt={product.name}
                    className="w-full h-64 object-cover group-hover:scale-105 transition-zen"
                  />
                  <div className="absolute top-4 left-4">
                    <Badge variant={product.inStock ? "default" : "destructive"}>
                      {product.inStock ? "Dostępny" : "Wyprzedany"}
                    </Badge>
                  </div>
                  {product.category === "Bony" && (
                    <div className="absolute top-4 right-4 bg-yellow-500 rounded-full p-2">
                      <Gift className="h-4 w-4 text-white" />
                    </div>
                  )}
                  {product.category !== "Bony" && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute top-4 right-4 bg-white/90 hover:bg-white"
                    >
                      <Heart className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline" className="text-xs">
                      {product.category}
                    </Badge>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-hanami-primary mb-2">
                    {product.name}
                  </h3>
                  
                  <p className="text-hanami-neutral mb-4 text-sm">
                    {product.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-hanami-primary">
                      {product.price} zł
                    </span>
                    {product.category === "Bony" ? (
                      <Button 
                        size="sm" 
                        disabled={!product.inStock || loading}
                        onClick={() => purchaseVoucher(product)}
                        className="bg-yellow-500 hover:bg-yellow-600"
                      >
                        <Gift className="h-4 w-4 mr-2" />
                        {loading ? "Kupowanie..." : "Kup bon"}
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        disabled={!product.inStock}
                        onClick={() => addToCart(product)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {product.inStock ? "Dodaj" : "Niedostępny"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-hanami-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-light text-hanami-primary mb-4">
              Dlaczego warto kupować u nas?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-hanami-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="h-8 w-8 text-hanami-primary" />
              </div>
              <h3 className="text-xl font-semibold text-hanami-primary mb-2">
                Darmowa dostawa
              </h3>
              <p className="text-hanami-neutral">
                Bezpłatna dostawa dla zamówień powyżej 150 zł
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-hanami-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-hanami-primary" />
              </div>
              <h3 className="text-xl font-semibold text-hanami-primary mb-2">
                Naturalne składniki
              </h3>
              <p className="text-hanami-neutral">
                Wszystkie produkty zawierają tylko naturalne składniki
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-hanami-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <Badge className="h-8 w-8 bg-hanami-primary" />
              </div>
              <h3 className="text-xl font-semibold text-hanami-primary mb-2">
                Gwarancja jakości
              </h3>
              <p className="text-hanami-neutral">
                30 dni na zwrot towaru bez podania przyczyny
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Shopping Cart Summary */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          <Card className="shadow-floating">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <ShoppingBag className="h-6 w-6 text-hanami-primary" />
                <div>
                  <p className="font-semibold">Koszyk ({getCartItemCount()})</p>
                  <p className="text-sm text-hanami-neutral">
                    Łącznie: {cart.reduce((sum, item) => sum + item.price, 0)} zł
                  </p>
                </div>
                <Button size="sm" onClick={proceedToCheckout}>
                  Przejdź do kasy
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowCart(false)}>
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl overflow-hidden">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Koszyk ({getCartItemCount()})</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowCart(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Koszyk jest pusty</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.cartId} className="flex items-center space-x-3 border rounded-lg p-3">
                        <img
                          src={item.image_url || item.image || "/lovable-uploads/6abfd03e-faab-45ef-8c3f-8eb2cf6b0ea7.png"}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium text-sm">{item.name}</h3>
                          <p className="text-hanami-primary font-bold">{item.price} zł</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromCart(item.cartId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {cart.length > 0 && (
                <div className="border-t p-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-semibold">Łącznie:</span>
                    <span className="font-bold text-lg text-hanami-primary">
                      {cart.reduce((sum, item) => sum + item.price, 0)} zł
                    </span>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={proceedToCheckout}
                  >
                    Przejdź do kasy
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Shop;