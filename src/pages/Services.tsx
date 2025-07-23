import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Heart, Clock, Flower, Droplets, Star } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useServices } from "@/hooks/useServices";
import treatmentImage from "@/assets/treatment-room.jpg";

const Services = () => {
  const { services: allServices, categories: serviceCategories, loading } = useServices();
  const [selectedCategory, setSelectedCategory] = useState("Wszystkie");

  // Create icon mapping for services
  const getServiceIcon = (category: string, index: number) => {
    const icons = [
      <Sparkles className="h-6 w-6" />,
      <Heart className="h-6 w-6" />,
      <Clock className="h-6 w-6" />,
      <Flower className="h-6 w-6" />,
      <Droplets className="h-6 w-6" />,
      <Star className="h-6 w-6" />
    ];
    return icons[index % icons.length];
  };

  // Filter services based on selected category
  const filteredServices = selectedCategory === "Wszystkie" 
    ? allServices 
    : allServices.filter(service => service.category === selectedCategory);

  // Create categories list with "Wszystkie" option
  const categories = ["Wszystkie", ...serviceCategories.map(cat => cat.name)];

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-hanami text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-light mb-6">Nasze usługi</h1>
          <p className="text-xl max-w-3xl mx-auto text-white/90">
            Odkryj pełną gamę profesjonalnych zabiegów spa i masaży 
            inspirowanych japońską tradycją wellness
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Category Filters */}
          <div className="flex justify-center mb-12">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge 
                  key={category} 
                  variant={selectedCategory === category ? "default" : "outline"}
                  className="cursor-pointer hover:bg-hanami-secondary transition-zen"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, index) => (
                <Card key={index} className="border-hanami-accent/20">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-6 h-6 bg-hanami-secondary rounded animate-pulse"></div>
                      <div className="w-20 h-6 bg-hanami-secondary rounded animate-pulse"></div>
                    </div>
                    <div className="w-3/4 h-6 bg-hanami-secondary rounded mb-2 animate-pulse"></div>
                    <div className="w-full h-16 bg-hanami-secondary rounded mb-4 animate-pulse"></div>
                    <div className="space-y-3 mb-6">
                      <div className="w-full h-4 bg-hanami-secondary rounded animate-pulse"></div>
                      <div className="flex gap-1">
                        <div className="w-16 h-6 bg-hanami-secondary rounded animate-pulse"></div>
                        <div className="w-20 h-6 bg-hanami-secondary rounded animate-pulse"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="w-20 h-8 bg-hanami-secondary rounded animate-pulse"></div>
                      <div className="w-20 h-8 bg-hanami-secondary rounded animate-pulse"></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredServices.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-hanami-neutral text-lg">
                  Brak usług w wybranej kategorii.
                </p>
              </div>
            ) : (
              filteredServices.map((service, index) => (
                <Card key={service.id} className="group hover:shadow-elegant transition-zen border-hanami-accent/20">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-hanami-primary">
                        {getServiceIcon(service.category, index)}
                      </div>
                      <Badge variant="secondary">{service.category}</Badge>
                    </div>
                    
                    <h3 className="text-xl font-semibold text-hanami-primary mb-2">
                      {service.name}
                    </h3>
                    
                    <p className="text-hanami-neutral mb-4 text-sm">
                      {service.description}
                    </p>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-hanami-neutral">Czas trwania:</span>
                        <span className="font-medium">{service.duration} min</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-hanami-primary">
                        {service.price} zł
                      </span>
                      <Button size="sm" asChild>
                        <Link to="/booking">
                          Zarezerwuj
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </section>

      {/* About Services */}
      <section className="py-20 bg-hanami-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-light text-hanami-primary mb-6">
                Nasze podejście
              </h2>
              <p className="text-lg text-hanami-neutral mb-6">
                Każdy zabieg w Dayspa Hanami to starannie zaplanowane doświadczenie, 
                które łączy nowoczesne techniki z japońską filozofią wellness.
              </p>
              <p className="text-hanami-neutral mb-8">
                Nasze doświadczone terapeutki dostosowują każdy zabieg do 
                indywidualnych potrzeb klienta, zapewniając maksymalny komfort 
                i efektywność.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Star className="h-5 w-5 text-hanami-primary mt-1" />
                  <div>
                    <h4 className="font-semibold text-hanami-primary">Certyfikowane terapeutki</h4>
                    <p className="text-sm text-hanami-neutral">
                      Wszystkie nasze specjalistki posiadają odpowiednie kwalifikacje
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Droplets className="h-5 w-5 text-hanami-primary mt-1" />
                  <div>
                    <h4 className="font-semibold text-hanami-primary">Premium produkty</h4>
                    <p className="text-sm text-hanami-neutral">
                      Używamy tylko najwyższej jakości kosmetyków i olejków
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Heart className="h-5 w-5 text-hanami-primary mt-1" />
                  <div>
                    <h4 className="font-semibold text-hanami-primary">Indywidualne podejście</h4>
                    <p className="text-sm text-hanami-neutral">
                      Każdy zabieg dostosowujemy do Twoich potrzeb
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <img 
                src={treatmentImage} 
                alt="Treatment room" 
                className="rounded-lg shadow-elegant w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-hanami text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-light mb-6">
            Gotowy na relaks?
          </h2>
          <p className="text-xl mb-8 text-white/90">
            Zarezerwuj swoją wizytę już dziś i odkryj magię japońskiego spa
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link to="/booking">
              Zarezerwuj wizytę
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Services;