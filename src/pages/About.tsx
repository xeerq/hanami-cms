import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Heart, Star, Users } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import zenImage from "@/assets/spa-zen.jpg";

interface Therapist {
  id: string;
  name: string;
  specialization: string;
  experience: string;
  bio: string;
  avatar_url: string;
  is_active: boolean;
}

const About = () => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTherapists = async () => {
      try {
        const { data, error } = await supabase
          .from('therapists')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setTherapists(data || []);
      } catch (error) {
        console.error('Error fetching therapists:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTherapists();
  }, []);

  const values = [
    {
      icon: <Heart className="h-8 w-8 text-hanami-primary" />,
      title: "Pasja",
      description: "Każdy zabieg wykonujemy z pełnym zaangażowaniem i miłością do tego, co robimy."
    },
    {
      icon: <Award className="h-8 w-8 text-hanami-primary" />,
      title: "Jakość",
      description: "Używamy tylko najlepszych produktów i najnowszych technik masażu."
    },
    {
      icon: <Users className="h-8 w-8 text-hanami-primary" />,
      title: "Troska",
      description: "Dbamy o komfort i zadowolenie każdego naszego klienta."
    },
    {
      icon: <Star className="h-8 w-8 text-hanami-primary" />,
      title: "Doświadczenie",
      description: "Nasze terapeutki posiadają wieloletnie doświadczenie i certyfikaty."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-hanami text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-light mb-6">O nas</h1>
          <p className="text-xl max-w-3xl mx-auto text-white/90">
            Poznaj historię i filozofię Dayspa Hanami - miejsca, gdzie tradycja 
            spotyka się z nowoczesnością
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-light text-hanami-primary mb-6">
                Nasza historia
              </h2>
              <p className="text-lg text-hanami-neutral mb-6">
                Dayspa Hanami powstało z pasji do japońskiej kultury wellness 
                i głębokiego przekonania, że każdy zasługuje na chwile relaksu 
                i regeneracji w swoim życiu.
              </p>
              <p className="text-hanami-neutral mb-6">
                Nazwa "Hanami" pochodzi od japońskiej tradycji podziwiania 
                kwitnących wiśni - symbolu przemijającego piękna i chwil, 
                które warto celebrować. Podobnie jak ta tradycja, nasze spa 
                zachęca do zatrzymania się, zwolnienia i cieszenia się 
                obecną chwilą.
              </p>
              <p className="text-hanami-neutral mb-8">
                Oferujemy profesjonalne usługi masażu i spa w sercu Ostrowa 
                Wielkopolskiego, łącząc najlepsze tradycje Wschodu z nowoczesnymi 
                technikami terapeutycznymi.
              </p>
              <Button size="lg" asChild>
                <a href="/services">Poznaj nasze usługi</a>
              </Button>
            </div>
            <div className="relative">
              <img 
                src={zenImage} 
                alt="Zen philosophy" 
                className="rounded-lg shadow-elegant w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-hanami-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-light text-hanami-primary mb-4">
              Nasze wartości
            </h2>
            <p className="text-lg text-hanami-neutral max-w-2xl mx-auto">
              To, co kieruje nami w codziennej pracy i sprawia, że jesteśmy 
              wyjątkowi w branży wellness
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className="text-center group">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-hanami-secondary rounded-full mb-6 group-hover:bg-hanami-accent transition-zen">
                  {value.icon}
                </div>
                <h3 className="text-xl font-semibold text-hanami-primary mb-4">
                  {value.title}
                </h3>
                <p className="text-hanami-neutral">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-light text-hanami-primary mb-4">
              Nasz zespół
            </h2>
            <p className="text-lg text-hanami-neutral max-w-2xl mx-auto">
              Poznaj doświadczone terapeutki, które zadbają o Twój komfort 
              i relaks podczas każdej wizyty
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {loading ? (
              // Loading skeletons
              Array.from({ length: 2 }).map((_, index) => (
                <Card key={index} className="border-hanami-accent/20">
                  <CardContent className="p-6 text-center">
                    <Skeleton className="w-24 h-24 rounded-full mx-auto mb-4" />
                    <Skeleton className="h-6 w-32 mx-auto mb-2" />
                    <Skeleton className="h-5 w-40 mx-auto mb-2" />
                    <Skeleton className="h-4 w-28 mx-auto mb-3" />
                    <Skeleton className="h-4 w-full mb-4" />
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : therapists.length > 0 ? (
              therapists.map((therapist) => (
                <Card key={therapist.id} className="hover:shadow-elegant transition-zen border-hanami-accent/20">
                  <CardContent className="p-6 text-center">
                    <Avatar className="w-24 h-24 mx-auto mb-4">
                      <AvatarImage 
                        src={therapist.avatar_url} 
                        alt={therapist.name}
                      />
                      <AvatarFallback className="bg-hanami-secondary text-hanami-primary text-lg">
                        {therapist.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="text-xl font-semibold text-hanami-primary mb-2">
                      {therapist.name}
                    </h3>
                    <p className="text-hanami-primary font-medium mb-2">
                      Terapeuta
                    </p>
                    <p className="text-sm text-hanami-neutral mb-3">
                      {therapist.experience}
                    </p>
                    <p className="text-sm text-hanami-neutral mb-4">
                      <strong>Specjalizacja:</strong> {therapist.specialization}
                    </p>
                    <p className="text-sm text-hanami-neutral">
                      {therapist.bio}
                    </p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-2 text-center py-8">
                <p className="text-hanami-neutral">
                  Brak aktywnych terapeutów do wyświetlenia.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-20 bg-gradient-hanami text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-light mb-6">
            Filozofia Hanami
          </h2>
          <p className="text-xl mb-8 text-white/90">
            "Hanami" to japońska tradycja kontemplacji przemijającego piękna 
            kwitnących wiśni. W naszym spa tworzymy przestrzeń, gdzie możesz 
            zatrzymać się, odetchnąć i docenić piękno obecnej chwili.
          </p>
          <blockquote className="text-lg italic text-white/80 mb-8">
            "Prawdziwe piękno tkwi w umiejętności zatrzymania się i 
            docenienia chwili, którą mamy teraz."
          </blockquote>
          <Button size="lg" variant="secondary" asChild>
            <a href="/booking">Zarezerwuj swoją chwilę relaksu</a>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;