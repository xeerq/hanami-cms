import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Clock, Facebook, Instagram } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-hanami-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <img 
              src="/lovable-uploads/152f7754-c797-4189-b673-6e2549f67d3e.png" 
              alt="Hanami SPA" 
              className="h-12 w-auto brightness-0 invert"
            />
            <p className="text-sm text-primary-foreground/80">
              Profesjonalne usługi masażu i spa w sercu Ostrowa Wielkopolskiego. 
              Japońska filozofia relaksu i regeneracji.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Szybkie linki</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/services" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-zen">
                  Usługi
                </Link>
              </li>
              <li>
                <Link to="/booking" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-zen">
                  Rezerwacja
                </Link>
              </li>
              <li>
                <Link to="/shop" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-zen">
                  Sklep
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-zen">
                  O nas
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Kontakt</h3>
            <ul className="space-y-3">
              <li className="flex items-center space-x-3">
                <MapPin className="h-4 w-4" />
                <span className="text-sm text-primary-foreground/80">
                  Ostrów Wielkopolski
                </span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="h-4 w-4" />
                <span className="text-sm text-primary-foreground/80">
                  +48 123 456 789
                </span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="h-4 w-4" />
                <span className="text-sm text-primary-foreground/80">
                  info@dayspahanami.pl
                </span>
              </li>
              <li className="flex items-center space-x-3">
                <Clock className="h-4 w-4" />
                <span className="text-sm text-primary-foreground/80">
                  Pn-Pt: 9:00-20:00
                </span>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Śledź nas</h3>
            <div className="flex space-x-4">
              <a 
                href="https://www.facebook.com/dayspahanami" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary-foreground/80 hover:text-primary-foreground transition-zen"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a 
                href="#" 
                className="text-primary-foreground/80 hover:text-primary-foreground transition-zen"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-primary-foreground/20">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-primary-foreground/60">
              © 2024 Dayspa Hanami. Wszystkie prawa zastrzeżone.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link to="/privacy" className="text-sm text-primary-foreground/60 hover:text-primary-foreground/80 transition-zen">
                Polityka prywatności
              </Link>
              <Link to="/terms" className="text-sm text-primary-foreground/60 hover:text-primary-foreground/80 transition-zen">
                Regulamin
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;