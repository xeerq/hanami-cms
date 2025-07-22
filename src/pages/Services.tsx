import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Heart, Clock, Flower, Droplets, Star } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import treatmentImage from "@/assets/treatment-room.jpg";

const Services = () => {
  const services = [
    {
      id: 1,
      title: "Masaż relaksacyjny",
      description: "Tradycyjny masaż inspirowany japońską filozofią zen. Delikatne ruchy i naturalne olejki przeniosą Cię w stan głębokiego relaksu.",
      duration: "60 min",
      price: "200 zł",
      icon: <Sparkles className="h-6 w-6" />,
      category: "Masaże",
      benefits: ["Redukcja stresu", "Poprawa krążenia", "Relaks mięśni"]
    },
    {
      id: 2,
      title: "Masaż terapeutyczny",
      description: "Profesjonalny masaż leczniczy dla zdrowia kręgosłupa i stawów. Łączy techniki szwedzkie z metodami orientalnymi.",
      duration: "90 min",
      price: "280 zł",
      icon: <Heart className="h-6 w-6" />,
      category: "Masaże",
      benefits: ["Ułatwienie bólu", "Poprawa ruchomości", "Regeneracja mięśni"]
    },
    {
      id: 3,
      title: "Masaż hot stone",
      description: "Relaksujący masaż z użyciem rozgrzanych kamieni bazaltowych. Ciepło głęboko penetruje mięśnie.",
      duration: "75 min",
      price: "350 zł",
      icon: <Clock className="h-6 w-6" />,
      category: "Masaże",
      benefits: ["Głęboki relaks", "Detoksykacja", "Poprawa krążenia"]
    },
    {
      id: 4,
      title: "Masaż aromaterapeutyczny",
      description: "Masaż z użyciem wyselekcjonowanych olejków eterycznych dostosowanych do Twoich potrzeb.",
      duration: "60 min",
      price: "220 zł",
      icon: <Flower className="h-6 w-6" />,
      category: "Masaże",
      benefits: ["Aromaterapia", "Redukcja napięć", "Harmonizacja"]
    },
    {
      id: 5,
      title: "Zabieg nawilżający twarzy",
      description: "Intensywnie nawilżający zabieg z użyciem japońskich kosmetyków premium.",
      duration: "45 min",
      price: "180 zł",
      icon: <Droplets className="h-6 w-6" />,
      category: "Pielęgnacja twarzy",
      benefits: ["Nawilżenie", "Odmłodzenie", "Rozświetlenie"]
    },
    {
      id: 6,
      title: "Masaż prenatalny",
      description: "Delikatny masaż dedykowany przyszłym mamom. Bezpieczny i relaksujący podczas ciąży.",
      duration: "50 min",
      price: "200 zł",
      icon: <Star className="h-6 w-6" />,
      category: "Specjalistyczne",
      benefits: ["Bezpieczeństwo", "Komfort", "Redukcja obrzęków"]
    }
  ];

  const categories = ["Wszystkie", "Masaże", "Pielęgnacja twarzy", "Specjalistyczne"];

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
                  variant="outline" 
                  className="cursor-pointer hover:bg-hanami-secondary transition-zen"
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <Card key={service.id} className="group hover:shadow-elegant transition-zen border-hanami-accent/20">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-hanami-primary">
                      {service.icon}
                    </div>
                    <Badge variant="secondary">{service.category}</Badge>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-hanami-primary mb-2">
                    {service.title}
                  </h3>
                  
                  <p className="text-hanami-neutral mb-4 text-sm">
                    {service.description}
                  </p>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-hanami-neutral">Czas trwania:</span>
                      <span className="font-medium">{service.duration}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {service.benefits.map((benefit, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {benefit}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-hanami-primary">
                      {service.price}
                    </span>
                    <Button size="sm" asChild>
                      <Link to="/booking">
                        Zarezerwuj
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
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