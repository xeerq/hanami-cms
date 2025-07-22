import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Heart, Plus, Minus } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Shop = () => {
  const [cart, setCart] = useState<any[]>([]);

  const products = [
    {
      id: 1,
      name: "Olejek do masażu Sakura",
      description: "Luksusowy olejek do masażu o zapachu kwitnących wiśni",
      price: 89,
      category: "Olejki",
      image: "/lovable-uploads/6abfd03e-faab-45ef-8c3f-8eb2cf6b0ea7.png",
      inStock: true
    },
    {
      id: 2,
      name: "Krem regenerujący Hanami",
      description: "Intensywnie nawilżający krem do ciała z ekstraktami roślin",
      price: 65,
      category: "Kosmetyki",
      image: "/lovable-uploads/3140ba04-33e9-4565-bb1c-d1c585d11e13.png",
      inStock: true
    },
    {
      id: 3,
      name: "Zestaw kamieni bazaltowych",
      description: "Profesjonalne kamienie do masażu hot stone",
      price: 199,
      category: "Akcesoria",
      image: "/lovable-uploads/36929f8b-ac5b-4aed-9ac9-ad38a48028a6.png",
      inStock: true
    },
    {
      id: 4,
      name: "Świeca aromaterapeutyczna",
      description: "Naturalna świeca sojowa o zapachu relaksującym",
      price: 45,
      category: "Aromaterapia",
      image: "/lovable-uploads/a3bc1f9a-ac00-4ccb-8ad5-7532935671d9.png",
      inStock: true
    },
    {
      id: 5,
      name: "Olejek eteryczny lawenda",
      description: "100% naturalny olejek eteryczny z lawendy",
      price: 39,
      category: "Olejki",
      image: "/lovable-uploads/6abfd03e-faab-45ef-8c3f-8eb2cf6b0ea7.png",
      inStock: false
    },
    {
      id: 6,
      name: "Masażer bambusowy",
      description: "Tradycyjny bambusowy masażer do punktowego masażu",
      price: 79,
      category: "Akcesoria",
      image: "/lovable-uploads/3140ba04-33e9-4565-bb1c-d1c585d11e13.png",
      inStock: true
    }
  ];

  const categories = ["Wszystkie", "Olejki", "Kosmetyki", "Akcesoria", "Aromaterapia"];
  const [selectedCategory, setSelectedCategory] = useState("Wszystkie");

  const filteredProducts = selectedCategory === "Wszystkie" 
    ? products 
    : products.filter(product => product.category === selectedCategory);

  const addToCart = (product: any) => {
    setCart([...cart, product]);
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
              <Button variant="secondary" size="lg">
                <ShoppingBag className="h-5 w-5 mr-2" />
                Koszyk ({getCartItemCount()})
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
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-64 object-cover group-hover:scale-105 transition-zen"
                  />
                  <div className="absolute top-4 left-4">
                    <Badge variant={product.inStock ? "default" : "destructive"}>
                      {product.inStock ? "Dostępny" : "Wyprzedany"}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute top-4 right-4 bg-white/90 hover:bg-white"
                  >
                    <Heart className="h-4 w-4" />
                  </Button>
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
                    <Button 
                      size="sm" 
                      disabled={!product.inStock}
                      onClick={() => addToCart(product)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {product.inStock ? "Dodaj" : "Niedostępny"}
                    </Button>
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
                <Button size="sm">
                  Przejdź do kasy
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Shop;