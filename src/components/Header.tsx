import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, Calendar, ShoppingBag, Menu, X, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useTherapistCheck } from "@/hooks/useTherapistCheck";
const Header = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminCheck();
  const { isTherapist } = useTherapistCheck();

  const handleSignOut = async () => {
    await signOut();
  };

  const navigation = [
    { name: "Strona główna", href: "/" },
    { name: "Usługi", href: "/services" },
    { name: "Rezerwacja", href: "/booking" },
    { name: "Kalendarze", href: "/calendars" },
    { name: "Sklep", href: "/shop" },
    { name: "O nas", href: "/about" },
    { name: "Kontakt", href: "/contact" },
  ];

  return (
    <header className="bg-gradient-warm shadow-soft sticky top-0 z-50 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="flex items-center">
              <img 
                src="/lovable-uploads/152f7754-c797-4189-b673-6e2549f67d3e.png" 
                alt="Hanami SPA" 
                className="h-10 w-auto"
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`text-sm font-medium transition-zen ${
                  location.pathname === item.href
                    ? "text-hanami-primary"
                    : "text-hanami-neutral hover:text-hanami-primary"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-sm text-hanami-neutral">
                  Witaj, {user.email}
                </span>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/dashboard">
                    <User className="h-4 w-4 mr-2" />
                    Panel
                  </Link>
                </Button>
                {isAdmin && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/admin">
                      Admin
                    </Link>
                  </Button>
                )}
                {isTherapist && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/therapist">
                      Masażysta
                    </Link>
                  </Button>
                )}
                <Button size="sm" asChild>
                  <Link to="/booking">
                    <Calendar className="h-4 w-4 mr-2" />
                    Rezerwuj
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Wyloguj
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/auth">
                    <User className="h-4 w-4 mr-2" />
                    Zaloguj się
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/booking">
                    <Calendar className="h-4 w-4 mr-2" />
                    Rezerwuj
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-hanami-accent/20">
            <nav className="flex flex-col space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`px-3 py-2 text-sm font-medium transition-zen ${
                    location.pathname === item.href
                      ? "text-hanami-primary bg-hanami-secondary/20"
                      : "text-hanami-neutral hover:text-hanami-primary hover:bg-hanami-secondary/10"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="pt-2 space-y-2">
                {user ? (
                  <>
                    <div className="px-3 py-2 text-sm text-hanami-neutral">
                      Zalogowany jako: {user.email}
                    </div>
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>
                        <User className="h-4 w-4 mr-2" />
                        Panel użytkownika
                      </Link>
                    </Button>
                    <Button size="sm" className="w-full" asChild>
                      <Link to="/booking" onClick={() => setIsMenuOpen(false)}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Rezerwuj
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => {
                      handleSignOut();
                      setIsMenuOpen(false);
                    }}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Wyloguj
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                        <User className="h-4 w-4 mr-2" />
                        Zaloguj się
                      </Link>
                    </Button>
                    <Button size="sm" className="w-full" asChild>
                      <Link to="/booking" onClick={() => setIsMenuOpen(false)}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Rezerwuj
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;