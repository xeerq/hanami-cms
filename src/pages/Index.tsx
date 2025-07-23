import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Heart, Clock, Star, Calendar, ShoppingBag, Users, Award } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useServices } from "@/hooks/useServices";
import heroImage from "@/assets/hero-spa.jpg";
import zenImage from "@/assets/spa-zen.jpg";
import treatmentImage from "@/assets/treatment-room.jpg";

const Index = () => {
  const { services: allServices, loading } = useServices();
  
  // Take first 3 services for homepage display
  const services = allServices.slice(0, 3).map((service, index) => ({
    title: service.name,
    description: service.description || '',
    duration: `${service.duration} min`,
    price: `${service.price} zł`,
    icon: [
      <Sparkles className="h-6 w-6" />,
      <Heart className="h-6 w-6" />,
      <Clock className="h-6 w-6" />
    ][index] || <Star className="h-6 w-6" />
  }));

  const features = [
    {
      icon: <Users className="h-8 w-8 text-hanami-primary" />,
      title: "Doświadczone terapeutki",
      description: "Nasze masażystki posiadają wieloletnie doświadczenie i certyfikaty"
    },
    {
      icon: <Award className="h-8 w-8 text-hanami-primary" />,
      title: "Wysokiej jakości produkty",
      description: "Używamy tylko najlepszych, naturalnych olejków i kosmetyków"
    },
    {
      icon: <Star className="h-8 w-8 text-hanami-primary" />,
      title: "Indywidualne podejście",
      description: "Każdy zabieg dostosowujemy do potrzeb i preferencji klienta"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Header />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        
        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-light text-white mb-6 tracking-wide">
            Salon
            <span className="block text-hanami-accent">Hanami-Spa</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 font-light">
            Odkryj japońską filozofię relaksu w sercu Ostrowa Wielkopolskiego
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-hanami-primary hover:bg-hanami-primary-light text-white" asChild>
              <Link to="/booking">
                <Calendar className="h-5 w-5 mr-2" />
                Zarezerwuj wizytę
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" asChild>
              <Link to="/services">
                Poznaj nasze usługi
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-light text-hanami-primary mb-4">
              Nasze usługi
            </h2>
            <p className="text-lg text-hanami-neutral max-w-2xl mx-auto">
              Profesjonalne masaże i zabiegi spa inspirowane japońską tradycją i nowoczesnymi technikami
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {loading ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className="border-hanami-accent/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-6 h-6 bg-hanami-secondary rounded animate-pulse"></div>
                      <div className="w-16 h-6 bg-hanami-secondary rounded-full animate-pulse"></div>
                    </div>
                    <div className="w-3/4 h-6 bg-hanami-secondary rounded mb-2 animate-pulse"></div>
                    <div className="w-full h-4 bg-hanami-secondary rounded mb-4 animate-pulse"></div>
                    <div className="flex items-center justify-between">
                      <div className="w-20 h-8 bg-hanami-secondary rounded animate-pulse"></div>
                      <div className="w-20 h-8 bg-hanami-secondary rounded animate-pulse"></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              services.map((service, index) => (
                <Card key={index} className="group hover:shadow-elegant transition-zen border-hanami-accent/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-hanami-primary">
                        {service.icon}
                      </div>
                      <span className="text-sm text-hanami-neutral bg-hanami-secondary px-3 py-1 rounded-full">
                        {service.duration}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-hanami-primary mb-2">
                      {service.title}
                    </h3>
                    <p className="text-hanami-neutral mb-4">
                      {service.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-hanami-primary">
                        {service.price}
                      </span>
                      <Button size="sm" variant="outline" asChild>
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

          <div className="text-center mt-12">
            <Button size="lg" variant="outline" asChild>
              <Link to="/services">
                Zobacz wszystkie usługi
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* About Preview */}
      <section className="py-20 bg-hanami-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-light text-hanami-primary mb-6">
                Filozofia Hanami
              </h2>
              <p className="text-lg text-hanami-neutral mb-6">
                Hanami to japońska tradycja podziwiania kwitnących wiśni, symbolizująca 
                przemijającą piękność życia. W naszym spa łączymy tę filozofię z 
                nowoczesną terapią, tworząc przestrzeń harmonii i odnowy.
              </p>
              <p className="text-hanami-neutral mb-8">
                Nasze doświadczone terapeutki oferują personalizowane zabiegi, 
                które nie tylko relaksują ciało, ale także uspokajają umysł, 
                przywracając naturalną równowagę.
              </p>
              <Button asChild>
                <Link to="/about">
                  Poznaj naszą historię
                </Link>
              </Button>
            </div>
            <div className="relative">
              <img 
                src={zenImage} 
                alt="Zen garden" 
                className="rounded-lg shadow-elegant w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-light text-hanami-primary mb-4">
              Dlaczego wybierają nas klienci
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center group">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-hanami-secondary rounded-full mb-6 group-hover:bg-hanami-accent transition-zen">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-hanami-primary mb-4">
                  {feature.title}
                </h3>
                <p className="text-hanami-neutral">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-hanami text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-light mb-6">
            Gotowy na chwilę relaksu?
          </h2>
          <p className="text-xl mb-8 text-white/90">
            Zarezerwuj swoją wizytę już dziś i doświadcz magii japońskiego spa
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/booking">
                <Calendar className="h-5 w-5 mr-2" />
                Zarezerwuj wizytę
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" asChild>
              <Link to="/shop">
                <ShoppingBag className="h-5 w-5 mr-2" />
                Odwiedź sklep
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;