import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const profileSchema = z.object({
  first_name: z.string().min(1, "Imię jest wymagane"),
  last_name: z.string().min(1, "Nazwisko jest wymagane"),
  phone: z.string().optional(),
});

const deliveryAddressSchema = z.object({
  street: z.string().min(1, "Ulica jest wymagana"),
  house_number: z.string().min(1, "Numer domu jest wymagany"),
  apartment_number: z.string().optional(),
  postal_code: z.string().min(1, "Kod pocztowy jest wymagany"),
  city: z.string().min(1, "Miasto jest wymagane"),
  country: z.string().min(1, "Kraj jest wymagany"),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type DeliveryAddressFormData = z.infer<typeof deliveryAddressSchema>;

interface Profile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  delivery_address: any;
}

export const ProfileForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      phone: "",
    },
  });

  const deliveryForm = useForm<DeliveryAddressFormData>({
    resolver: zodResolver(deliveryAddressSchema),
    defaultValues: {
      street: "",
      house_number: "",
      apartment_number: "",
      postal_code: "",
      city: "",
      country: "Polska",
    },
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
        profileForm.reset({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          phone: data.phone || "",
        });

        if (data.delivery_address && typeof data.delivery_address === 'object') {
          const address = data.delivery_address as any;
          deliveryForm.reset({
            street: address.street || "",
            house_number: address.house_number || "",
            apartment_number: address.apartment_number || "",
            postal_code: address.postal_code || "",
            city: address.city || "",
            country: address.country || "Polska",
          });
        }
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać danych profilu",
        variant: "destructive",
      });
    }
  };

  const onSubmitProfile = async (data: ProfileFormData) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
        });

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Dane osobowe zostały zaktualizowane",
      });

      fetchProfile();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować danych osobowych",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmitDeliveryAddress = async (data: DeliveryAddressFormData) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          delivery_address: data,
        });

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Adres dostawy został zaktualizowany",
      });

      fetchProfile();
    } catch (error: any) {
      console.error('Error updating delivery address:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować adresu dostawy",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p>Musisz być zalogowany, aby edytować profil.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mój Profil</h1>
        <p className="text-muted-foreground">Zarządzaj swoimi danymi osobowymi i adresem dostawy</p>
      </div>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="personal">Dane osobowe</TabsTrigger>
          <TabsTrigger value="address">Adres dostawy</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Dane osobowe</CardTitle>
              <CardDescription>
                Aktualizuj swoje podstawowe informacje kontaktowe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Imię *</Label>
                    <Input
                      id="first_name"
                      {...profileForm.register("first_name")}
                      placeholder="Wprowadź swoje imię"
                    />
                    {profileForm.formState.errors.first_name && (
                      <p className="text-sm text-destructive">
                        {profileForm.formState.errors.first_name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="last_name">Nazwisko *</Label>
                    <Input
                      id="last_name"
                      {...profileForm.register("last_name")}
                      placeholder="Wprowadź swoje nazwisko"
                    />
                    {profileForm.formState.errors.last_name && (
                      <p className="text-sm text-destructive">
                        {profileForm.formState.errors.last_name.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    {...profileForm.register("phone")}
                    placeholder="Wprowadź swój numer telefonu"
                    type="tel"
                  />
                  {profileForm.formState.errors.phone && (
                    <p className="text-sm text-destructive">
                      {profileForm.formState.errors.phone.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={loading}>
                    {loading ? "Zapisywanie..." : "Zapisz dane osobowe"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="address">
          <Card>
            <CardHeader>
              <CardTitle>Adres dostawy</CardTitle>
              <CardDescription>
                Ustaw swój domyślny adres dostawy dla zamówień ze sklepu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={deliveryForm.handleSubmit(onSubmitDeliveryAddress)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="street">Ulica *</Label>
                    <Input
                      id="street"
                      {...deliveryForm.register("street")}
                      placeholder="Nazwa ulicy"
                    />
                    {deliveryForm.formState.errors.street && (
                      <p className="text-sm text-destructive">
                        {deliveryForm.formState.errors.street.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="house_number">Numer domu *</Label>
                    <Input
                      id="house_number"
                      {...deliveryForm.register("house_number")}
                      placeholder="123"
                    />
                    {deliveryForm.formState.errors.house_number && (
                      <p className="text-sm text-destructive">
                        {deliveryForm.formState.errors.house_number.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="apartment_number">Numer mieszkania</Label>
                    <Input
                      id="apartment_number"
                      {...deliveryForm.register("apartment_number")}
                      placeholder="45"
                    />
                    {deliveryForm.formState.errors.apartment_number && (
                      <p className="text-sm text-destructive">
                        {deliveryForm.formState.errors.apartment_number.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Kod pocztowy *</Label>
                    <Input
                      id="postal_code"
                      {...deliveryForm.register("postal_code")}
                      placeholder="00-000"
                    />
                    {deliveryForm.formState.errors.postal_code && (
                      <p className="text-sm text-destructive">
                        {deliveryForm.formState.errors.postal_code.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">Miasto *</Label>
                    <Input
                      id="city"
                      {...deliveryForm.register("city")}
                      placeholder="Warszawa"
                    />
                    {deliveryForm.formState.errors.city && (
                      <p className="text-sm text-destructive">
                        {deliveryForm.formState.errors.city.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Kraj *</Label>
                  <Input
                    id="country"
                    {...deliveryForm.register("country")}
                    placeholder="Polska"
                  />
                  {deliveryForm.formState.errors.country && (
                    <p className="text-sm text-destructive">
                      {deliveryForm.formState.errors.country.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={loading}>
                    {loading ? "Zapisywanie..." : "Zapisz adres dostawy"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfileForm;