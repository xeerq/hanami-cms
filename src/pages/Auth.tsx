import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // TODO: Implement authentication
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Header />
      
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-md mx-auto">
          <Button variant="ghost" asChild className="mb-8">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Powrót do strony głównej
            </Link>
          </Button>

          <Tabs defaultValue="login" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Logowanie</TabsTrigger>
              <TabsTrigger value="register">Rejestracja</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl text-hanami-primary">Zaloguj się</CardTitle>
                  <CardDescription>
                    Wprowadź swoje dane, aby uzyskać dostęp do konta
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
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
                      <Label htmlFor="password">Hasło</Label>
                      <Input
                        id="password"
                        type="password"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Logowanie..." : "Zaloguj się"}
                    </Button>
                  </form>
                  <div className="mt-4 text-center">
                    <Link to="/forgot-password" className="text-sm text-hanami-primary hover:underline">
                      Zapomniałeś hasła?
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl text-hanami-primary">Utwórz konto</CardTitle>
                  <CardDescription>
                    Załóż konto, aby móc rezerwować wizyty i zarządzać swoim profilem
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">Imię</Label>
                        <Input
                          id="firstName"
                          placeholder="Imię"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Nazwisko</Label>
                        <Input
                          id="lastName"
                          placeholder="Nazwisko"
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
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Hasło</Label>
                      <Input
                        id="password"
                        type="password"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Potwierdź hasło</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Tworzenie konta..." : "Utwórz konto"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Auth;