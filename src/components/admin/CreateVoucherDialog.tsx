import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface CreateVoucherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Service {
  id: string;
  name: string;
  price: number;
}

export function CreateVoucherDialog({ open, onOpenChange, onSuccess }: CreateVoucherDialogProps) {
  const [voucherType, setVoucherType] = useState<'single' | 'package'>('single');
  const [serviceId, setServiceId] = useState<string>('');
  const [purchaserType, setPurchaserType] = useState<'guest' | 'registered'>('guest');
  const [purchaserName, setPurchaserName] = useState('');
  const [purchaserEmail, setPurchaserEmail] = useState('');
  const [purchaserPhone, setPurchaserPhone] = useState('');
  const [value, setValue] = useState('');
  const [sessions, setSessions] = useState('1');
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    try {
      const [servicesResponse, profilesResponse] = await Promise.all([
        supabase.from('services').select('id, name, price').eq('is_active', true),
        supabase.from('profiles').select('user_id, first_name, last_name')
      ]);

      if (servicesResponse.error) throw servicesResponse.error;
      if (profilesResponse.error) throw profilesResponse.error;

      setServices(servicesResponse.data || []);
      setProfiles(profilesResponse.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować danych",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setVoucherType('single');
    setServiceId('');
    setPurchaserType('guest');
    setPurchaserName('');
    setPurchaserEmail('');
    setPurchaserPhone('');
    setValue('');
    setSessions('1');
    setExpiresAt('');
    setNotes('');
    setSelectedUserId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generate unique code
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_voucher_code');

      if (codeError) throw codeError;

      const voucherData = {
        code: codeData,
        voucher_type: voucherType,
        service_id: serviceId || null,
        user_id: purchaserType === 'registered' ? selectedUserId : null,
        purchaser_name: purchaserType === 'guest' ? purchaserName : null,
        purchaser_email: purchaserType === 'guest' ? purchaserEmail : null,
        purchaser_phone: purchaserType === 'guest' ? purchaserPhone : null,
        original_value: voucherType === 'single' ? parseFloat(value) : null,
        remaining_value: voucherType === 'single' ? parseFloat(value) : null,
        original_sessions: parseInt(sessions),
        remaining_sessions: parseInt(sessions),
        expires_at: expiresAt || null,
        notes: notes || null,
        status: 'active'
      };

      const { error } = await supabase
        .from('vouchers')
        .insert(voucherData);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: `Bon ${codeData} został utworzony`,
      });

      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating voucher:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się utworzyć bonu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Utwórz nowy bon podarunkowy</DialogTitle>
          <DialogDescription>
            Wypełnij formularz aby utworzyć nowy bon lub pakiet masażu
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Typ bonu</Label>
              <RadioGroup
                value={voucherType}
                onValueChange={(value) => setVoucherType(value as 'single' | 'package')}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="single" />
                  <Label htmlFor="single">Pojedynczy masaż</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="package" id="package" />
                  <Label htmlFor="package">Pakiet masaży</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service">Usługa (opcjonalne)</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz usługę lub zostaw puste" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Wszystkie usługi</SelectItem>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} - {service.price} zł
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <Label>Nabywca bonu</Label>
            <RadioGroup
              value={purchaserType}
              onValueChange={(value) => setPurchaserType(value as 'guest' | 'registered')}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="guest" id="guest" />
                <Label htmlFor="guest">Gość (bez konta)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="registered" id="registered" />
                <Label htmlFor="registered">Zarejestrowany użytkownik</Label>
              </div>
            </RadioGroup>

            {purchaserType === 'guest' ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchaserName">Imię i nazwisko</Label>
                  <Input
                    id="purchaserName"
                    value={purchaserName}
                    onChange={(e) => setPurchaserName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchaserEmail">Email</Label>
                  <Input
                    id="purchaserEmail"
                    type="email"
                    value={purchaserEmail}
                    onChange={(e) => setPurchaserEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchaserPhone">Telefon</Label>
                  <Input
                    id="purchaserPhone"
                    value={purchaserPhone}
                    onChange={(e) => setPurchaserPhone(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="userId">Wybierz użytkownika</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz użytkownika" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.user_id} value={profile.user_id}>
                        {profile.first_name} {profile.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {voucherType === 'single' ? (
              <div className="space-y-2">
                <Label htmlFor="value">Wartość (zł)</Label>
                <Input
                  id="value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="sessions">Liczba sesji</Label>
                <Input
                  id="sessions"
                  type="number"
                  min="1"
                  value={sessions}
                  onChange={(e) => setSessions(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="expiresAt">Data ważności (opcjonalne)</Label>
              <Input
                id="expiresAt"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notatki (opcjonalne)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Dodatkowe informacje o bonie..."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Tworzenie..." : "Utwórz bon"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}