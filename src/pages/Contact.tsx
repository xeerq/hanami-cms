import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Phone, Mail, Clock, Facebook, Instagram } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCMSContent } from "@/hooks/useCMSContent";

const Contact = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { getContent, loading: cmsLoading } = useCMSContent([
    'contact_hero',
    'contact_info',
    'contact_form',
    'contact_faq',
    'contact_map',
    'social_media'
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // TODO: Implement contact form submission
    setTimeout(() => setIsLoading(false), 1000);
  };

  // CMS Content
  const heroContent = getContent('contact_hero');
  const contactInfoContent = getContent('contact_info');
  const formContent = getContent('contact_form');
  const faqContent = getContent('contact_faq');
  const mapContent = getContent('contact_map');
  const socialContent = getContent('social_media');

  const contactInfo = [
    {
      icon: <MapPin className="h-6 w-6" />,
      title: contactInfoContent.address?.title || "Adres",
      details: contactInfoContent.address?.details || ["Ostrów Wielkopolski", "ul. Przykładowa 123", "63-400 Ostrów Wielkopolski"]
    },
    {
      icon: <Phone className="h-6 w-6" />,
      title: contactInfoContent.phone?.title || "Telefon",
      details: contactInfoContent.phone?.details || ["+48 123 456 789", "+48 987 654 321"]
    },
    {
      icon: <Mail className="h-6 w-6" />,
      title: contactInfoContent.email?.title || "Email",
      details: contactInfoContent.email?.details || ["info@dayspahanami.pl", "rezerwacje@dayspahanami.pl"]
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: contactInfoContent.hours?.title || "Godziny otwarcia",
      details: contactInfoContent.hours?.details || [
        "Poniedziałek - Piątek: 9:00 - 20:00",
        "Sobota: 10:00 - 18:00", 
        "Niedziela: 11:00 - 17:00"
      ]
    }
  ];

  const faqItems = faqContent.items || [
    {
      question: "Jak mogę zarezerwować wizytę?",
      answer: "Możesz zarezerwować wizytę online przez naszą stronę internetową, telefonicznie lub osobiście w salonie."
    },
    {
      question: "Czy mogę anulować rezerwację?",
      answer: "Tak, rezerwację można anulować do 24 godzin przed umówionym terminem bez ponoszenia dodatkowych kosztów."
    },
    {
      question: "Jakie formy płatności przyjmujecie?",
      answer: "Przyjmujemy płatności gotówką, kartą płatniczą oraz BLIK."
    },
    {
      question: "Czy oferujecie pakiety zabiegów?",
      answer: "Tak, oferujemy różne pakiety zabiegów ze specjalnymi cenami. Szczegóły dostępne w zakładce Usługi."
    },
    {
      question: "Czy mogę kupić voucher na zabieg?",
      answer: "Tak, oferujemy vouchery podarunkowe na wszystkie nasze usługi. To idealny prezent dla bliskich."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-hanami text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-light mb-6">{heroContent.title || 'Kontakt'}</h1>
          <p className="text-xl max-w-3xl mx-auto text-white/90">
            {heroContent.description || 'Skontaktuj się z nami - jesteśmy tutaj, aby odpowiedzieć na wszystkie Twoje pytania dotyczące naszych usług'}
          </p>
        </div>
      </section>

      {/* Contact Info & Form */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-light text-hanami-primary mb-8">
                  {contactInfoContent.title || 'Informacje kontaktowe'}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {contactInfo.map((info, index) => (
                    <Card key={index} className="border-hanami-accent/20">
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="text-hanami-primary">
                            {info.icon}
                          </div>
                          <h3 className="font-semibold text-hanami-primary">
                            {info.title}
                          </h3>
                        </div>
                        <div className="space-y-1">
                          {info.details.map((detail, detailIndex) => (
                            <p key={detailIndex} className="text-hanami-neutral text-sm">
                              {detail}
                            </p>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Social Media */}
              <div>
                <h3 className="text-xl font-semibold text-hanami-primary mb-4">
                  {socialContent.title || 'Śledź nas w mediach społecznościowych'}
                </h3>
                <div className="flex space-x-4">
                  <a 
                    href={socialContent.facebook || "https://www.facebook.com/dayspahanami"} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-hanami-primary hover:text-hanami-primary-light transition-zen"
                  >
                    <Facebook className="h-5 w-5" />
                    <span>Facebook</span>
                  </a>
                  <a 
                    href={socialContent.instagram || "#"} 
                    className="flex items-center space-x-2 text-hanami-primary hover:text-hanami-primary-light transition-zen"
                  >
                    <Instagram className="h-5 w-5" />
                    <span>Instagram</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <Card className="border-hanami-accent/20">
                <CardHeader>
                  <CardTitle className="text-2xl text-hanami-primary">
                    {formContent.title || 'Napisz do nas'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">Imię</Label>
                        <Input
                          id="firstName"
                          placeholder="Twoje imię"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Nazwisko</Label>
                        <Input
                          id="lastName"
                          placeholder="Twoje nazwisko"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="twoj@email.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefon</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+48 123 456 789"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Temat</Label>
                      <Input
                        id="subject"
                        placeholder="Temat wiadomości"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Wiadomość</Label>
                      <Textarea
                        id="message"
                        placeholder="Twoja wiadomość..."
                        rows={5}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Wysyłanie..." : "Wyślij wiadomość"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-hanami-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-light text-hanami-primary mb-4">
              {faqContent.title || 'Często zadawane pytania'}
            </h2>
            <p className="text-hanami-neutral">
              {faqContent.description || 'Znajdź odpowiedzi na najczęściej zadawane pytania'}
            </p>
          </div>

          <div className="space-y-6">
            {faqItems.map((item, index) => (
              <Card key={index} className="border-hanami-accent/20">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-hanami-primary mb-3">
                    {item.question}
                  </h3>
                  <p className="text-hanami-neutral">
                    {item.answer}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-light text-hanami-primary mb-4">
              {mapContent.title || 'Jak nas znaleźć'}
            </h2>
            <p className="text-hanami-neutral">
              {mapContent.description || 'Znajdziesz nas w centrum Ostrowa Wielkopolskiego'}
            </p>
          </div>

          <div className="bg-hanami-secondary/20 rounded-lg p-8 text-center">
            <MapPin className="h-16 w-16 text-hanami-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-hanami-primary mb-2">
              {mapContent.map_title || 'Mapa Google'}
            </h3>
            <p className="text-hanami-neutral mb-4">
              {mapContent.map_description || 'Dokładną lokalizację znajdziesz na mapie Google'}
            </p>
            <Button variant="outline">
              {mapContent.button_text || 'Otwórz w Google Maps'}
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;