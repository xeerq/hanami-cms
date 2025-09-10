import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { validateEmail, validatePhone, sanitizeInput } from "@/lib/security";
import { User, Mail, Phone, MapPin, Calendar, Shield } from "lucide-react";

interface User {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  phone?: string;
  user_metadata: {
    first_name?: string;
    last_name?: string;
  };
  created_at: string;
  last_sign_in_at: string | null;
  is_banned?: boolean;
  profile?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    delivery_address?: {
      street?: string;
      house_number?: string;
      apartment_number?: string;
      postal_code?: string;
      city?: string;
      country?: string;
    };
    created_at?: string;
    updated_at?: string;
  };
}

interface EditUserDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

export const EditUserDialog = ({ user, open, onOpenChange, onUserUpdated }: EditUserDialogProps) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Address fields
  const [street, setStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [apartmentNumber, setApartmentNumber] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Polska");
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();

  // Reset form when user changes
  React.useEffect(() => {
    if (user) {
      setFirstName(user.profile?.first_name || user.user_metadata?.first_name || "");
      setLastName(user.profile?.last_name || user.user_metadata?.last_name || "");
      setEmail(user.email || "");
      setPhone(user.profile?.phone || user.phone || "");
      setEmailConfirmed(!!user.email_confirmed_at);
      
      // Set address fields
      const address = user.profile?.delivery_address;
      setStreet(address?.street || "");
      setHouseNumber(address?.house_number || "");
      setApartmentNumber(address?.apartment_number || "");
      setPostalCode(address?.postal_code || "");
      setCity(address?.city || "");
      setCountry(address?.country || "Polska");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate inputs
    if (!validateEmail(email)) {
      toast({
        title: "Błąd walidacji",
        description: "Nieprawidłowy format adresu email",
        variant: "destructive",
      });
      return;
    }

    if (phone && !validatePhone(phone)) {
      toast({
        title: "Błąd walidacji", 
        description: "Nieprawidłowy format numeru telefonu",
        variant: "destructive",
      });
      return;
    }

    // Sanitize inputs
    const sanitizedFirstName = sanitizeInput(firstName);
    const sanitizedLastName = sanitizeInput(lastName);
    const sanitizedPhone = phone ? sanitizeInput(phone) : null;

    try {
      setLoading(true);
      console.log("Starting user update for:", user.id, { firstName: sanitizedFirstName, lastName: sanitizedLastName, phone: sanitizedPhone });

      // Update auth user email using service function
      if (email !== user.email) {
        console.log("Updating email from", user.email, "to", email);
        const { error: emailError } = await supabase.functions.invoke('update-user-email', {
          body: { 
            userId: user.id, 
            newEmail: email 
          }
        });
        
        if (emailError) {
          console.error("Email update error:", emailError);
          toast({
            title: "Błąd",
            description: "Nie udało się zaktualizować adresu email: " + emailError.message,
            variant: "destructive",
          });
          return;
        }
        console.log("Email updated successfully");
      }

      // First, check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking existing profile:", checkError);
        throw new Error("Nie udało się sprawdzić istniejącego profilu: " + checkError.message);
      }

      console.log("Existing profile:", existingProfile);

      // Prepare delivery address object
      const deliveryAddress = street || houseNumber || postalCode || city ? {
        street: sanitizeInput(street),
        house_number: sanitizeInput(houseNumber),
        apartment_number: apartmentNumber ? sanitizeInput(apartmentNumber) : null,
        postal_code: sanitizeInput(postalCode),
        city: sanitizeInput(city),
        country: sanitizeInput(country)
      } : existingProfile?.delivery_address || {};

      // Use upsert to handle cases where profile doesn't exist yet
      const { data: updatedProfile, error } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          first_name: sanitizedFirstName,
          last_name: sanitizedLastName,
          phone: sanitizedPhone,
          delivery_address: deliveryAddress
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) {
        console.error("Profile upsert error:", error);
        throw new Error("Błąd podczas aktualizacji profilu: " + error.message + " (kod: " + error.code + ")");
      }

      console.log("Profile updated/created successfully:", updatedProfile);

      await logActivity({
        action: 'user_updated',
        details: {
          description: `Zaktualizowano dane użytkownika: ${sanitizedFirstName} ${sanitizedLastName}`,
          user_id: user.id,
          changes: {
            first_name: sanitizedFirstName !== user.user_metadata?.first_name,
            last_name: sanitizedLastName !== user.user_metadata?.last_name,
            phone: sanitizedPhone !== user.phone,
            email: email !== user.email
          }
        }
      });

      toast({
        title: "Sukces",
        description: "Dane użytkownika zostały zaktualizowane",
      });

      onUserUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zaktualizować danych użytkownika",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Edytuj użytkownika
          </DialogTitle>
          <DialogDescription>
            Zarządzaj danymi użytkownika w różnych kategoriach.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Podstawowe
              </TabsTrigger>
              <TabsTrigger value="address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Adres
              </TabsTrigger>
              <TabsTrigger value="system" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                System
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-4 w-4" />
                    Informacje podstawowe
                  </CardTitle>
                  <CardDescription>
                    Podstawowe dane kontaktowe użytkownika
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        Imię *
                      </Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Wprowadź imię"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        Nazwisko *
                      </Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Wprowadź nazwisko"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      Email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      required
                    />
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        emailConfirmed 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      }`}>
                        {emailConfirmed ? '✓ Potwierdzony' : '⚠ Niepotwierdzony'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      Telefon
                    </Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+48 123 456 789"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="address" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="h-4 w-4" />
                    Adres dostawy
                  </CardTitle>
                  <CardDescription>
                    Adres używany do dostaw zamówień (opcjonalny)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="street">Ulica</Label>
                      <Input
                        id="street"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        placeholder="Nazwa ulicy"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="houseNumber">Numer domu</Label>
                      <Input
                        id="houseNumber"
                        value={houseNumber}
                        onChange={(e) => setHouseNumber(e.target.value)}
                        placeholder="123"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="apartmentNumber">Numer mieszkania</Label>
                      <Input
                        id="apartmentNumber"
                        value={apartmentNumber}
                        onChange={(e) => setApartmentNumber(e.target.value)}
                        placeholder="45 (opcjonalnie)"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="postalCode">Kod pocztowy</Label>
                      <Input
                        id="postalCode"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="00-000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city">Miasto</Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Warszawa"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Kraj</Label>
                    <Input
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="Polska"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="system" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Shield className="h-4 w-4" />
                    Informacje systemowe
                  </CardTitle>
                  <CardDescription>
                    Dane systemowe i statusy użytkownika
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {user && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            Data utworzenia
                          </Label>
                          <div className="p-2 bg-muted rounded-md text-sm">
                            {new Date(user.created_at).toLocaleString('pl-PL')}
                          </div>
                        </div>

                        {user.last_sign_in_at && (
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              Ostatnie logowanie
                            </Label>
                            <div className="p-2 bg-muted rounded-md text-sm">
                              {new Date(user.last_sign_in_at).toLocaleString('pl-PL')}
                            </div>
                          </div>
                        )}
                      </div>

                      {user.profile?.created_at && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              Profil utworzony
                            </Label>
                            <div className="p-2 bg-muted rounded-md text-sm">
                              {new Date(user.profile.created_at).toLocaleString('pl-PL')}
                            </div>
                          </div>

                          {user.profile?.updated_at && (
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                Profil zaktualizowany
                              </Label>
                              <div className="p-2 bg-muted rounded-md text-sm">
                                {new Date(user.profile.updated_at).toLocaleString('pl-PL')}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Shield className="h-3 w-3" />
                          ID użytkownika
                        </Label>
                        <div className="p-2 bg-muted rounded-md text-xs font-mono break-all">
                          {user.id}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Zapisywanie..." : "Zapisz zmiany"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};