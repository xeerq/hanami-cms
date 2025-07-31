import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Service {
  id: string;
  name: string;
  price: number;
}

interface Profile {
  user_id: string;
  first_name: string;
  last_name: string;
}

interface Voucher {
  id: string;
  code: string;
  voucher_type: string;
  service_id?: string;
  user_id?: string;
  purchaser_email?: string;
  purchaser_phone?: string;
  purchaser_name?: string;
  original_value?: number;
  remaining_value?: number;
  original_sessions: number;
  remaining_sessions: number;
  status: string;
  expires_at?: string;
  notes?: string;
}

interface EditVoucherDialogProps {
  voucher: Voucher | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditVoucherDialog({ voucher, open, onOpenChange, onSuccess }: EditVoucherDialogProps) {
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  
  // Form states
  const [voucherType, setVoucherType] = useState<'single' | 'package'>('single');
  const [serviceId, setServiceId] = useState<string>('none');
  const [status, setStatus] = useState<string>('active');
  const [originalValue, setOriginalValue] = useState<string>('');
  const [remainingValue, setRemainingValue] = useState<string>('');
  const [originalSessions, setOriginalSessions] = useState<string>('1');
  const [remainingSessions, setRemainingSessions] = useState<string>('1');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [purchaserType, setPurchaserType] = useState<'guest' | 'registered'>('guest');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [purchaserName, setPurchaserName] = useState<string>('');
  const [purchaserEmail, setPurchaserEmail] = useState<string>('');
  const [purchaserPhone, setPurchaserPhone] = useState<string>('');

  const { toast } = useToast();

  useEffect(() => {
    if (open && voucher) {
      loadData();
      populateForm();
    }
  }, [open, voucher]);

  const loadData = async () => {
    try {
      const [servicesResult, profilesResult] = await Promise.all([
        supabase.from("services").select("id, name, price").eq("is_active", true),
        supabase.from("profiles").select("user_id, first_name, last_name")
      ]);

      if (servicesResult.error) throw servicesResult.error;
      if (profilesResult.error) throw profilesResult.error;

      setServices(servicesResult.data || []);
      setProfiles(profilesResult.data || []);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować danych",
        variant: "destructive",
      });
    }
  };

  const populateForm = () => {
    if (!voucher) return;

    setVoucherType(voucher.voucher_type as 'single' | 'package');
    setServiceId(voucher.service_id || 'none');
    setStatus(voucher.status);
    setOriginalValue(voucher.original_value?.toString() || '');
    setRemainingValue(voucher.remaining_value?.toString() || '');
    setOriginalSessions(voucher.original_sessions.toString());
    setRemainingSessions(voucher.remaining_sessions.toString());
    setExpiryDate(voucher.expires_at ? voucher.expires_at.split('T')[0] : '');
    setNotes(voucher.notes || '');
    
    if (voucher.user_id) {
      setPurchaserType('registered');
      setSelectedUserId(voucher.user_id);
    } else {
      setPurchaserType('guest');
      setPurchaserName(voucher.purchaser_name || '');
      setPurchaserEmail(voucher.purchaser_email || '');
      setPurchaserPhone(voucher.purchaser_phone || '');
    }
  };

  const resetForm = () => {
    setVoucherType('single');
    setServiceId('none');
    setStatus('active');
    setOriginalValue('');
    setRemainingValue('');
    setOriginalSessions('1');
    setRemainingSessions('1');
    setExpiryDate('');
    setNotes('');
    setPurchaserType('guest');
    setSelectedUserId('');
    setPurchaserName('');
    setPurchaserEmail('');
    setPurchaserPhone('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucher) return;

    setLoading(true);

    try {
      const updateData: any = {
        voucher_type: voucherType,
        service_id: serviceId === "none" ? null : serviceId || null,
        status: status,
        original_sessions: parseInt(originalSessions),
        remaining_sessions: parseInt(remainingSessions),
        expires_at: expiryDate ? new Date(expiryDate).toISOString() : null,
        notes: notes || null,
      };

      if (voucherType === 'single') {
        updateData.original_value = originalValue ? parseFloat(originalValue) : null;
        updateData.remaining_value = remainingValue ? parseFloat(remainingValue) : null;
      }

      if (purchaserType === 'registered') {
        updateData.user_id = selectedUserId;
        updateData.purchaser_name = null;
        updateData.purchaser_email = null;
        updateData.purchaser_phone = null;
      } else {
        updateData.user_id = null;
        updateData.purchaser_name = purchaserName;
        updateData.purchaser_email = purchaserEmail;
        updateData.purchaser_phone = purchaserPhone;
      }

      const { error } = await supabase
        .from("vouchers")
        .update(updateData)
        .eq("id", voucher.id);

      if (error) throw error;

      toast({
        title: "Sukces!",
        description: "Bon został zaktualizowany",
      });

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error updating voucher:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować bonu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!voucher) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edytuj bon - {voucher.code}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Typ bonu */}
          <div className="space-y-3">
            <Label>Typ bonu</Label>
            <RadioGroup value={voucherType} onValueChange={(value) => setVoucherType(value as 'single' | 'package')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="single" />
                <Label htmlFor="single">Jednorazowy (wartość pieniężna)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="package" id="package" />
                <Label htmlFor="package">Pakiet masaży (ilość sesji)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Wybór usługi */}
          <div className="space-y-2">
            <Label htmlFor="service">Usługa (opcjonalne)</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz usługę lub zostaw puste dla dowolnej" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Dowolna usługa</SelectItem>
                {services
                  .filter(service => service.id && service.id.trim() !== '')
                  .map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} - {service.price} zł
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktywny</SelectItem>
                <SelectItem value="used">Wykorzystany</SelectItem>
                <SelectItem value="expired">Wygasły</SelectItem>
                <SelectItem value="cancelled">Anulowany</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Wartość lub sesje */}
          {voucherType === 'single' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="originalValue">Pierwotna wartość (zł)</Label>
                <Input
                  id="originalValue"
                  type="number"
                  step="0.01"
                  value={originalValue}
                  onChange={(e) => setOriginalValue(e.target.value)}
                  placeholder="np. 200.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remainingValue">Pozostała wartość (zł)</Label>
                <Input
                  id="remainingValue"
                  type="number"
                  step="0.01"
                  value={remainingValue}
                  onChange={(e) => setRemainingValue(e.target.value)}
                  placeholder="np. 150.00"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="originalSessions">Pierwotna liczba sesji</Label>
                <Input
                  id="originalSessions"
                  type="number"
                  min="1"
                  value={originalSessions}
                  onChange={(e) => setOriginalSessions(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remainingSessions">Pozostała liczba sesji</Label>
                <Input
                  id="remainingSessions"
                  type="number"
                  min="0"
                  value={remainingSessions}
                  onChange={(e) => setRemainingSessions(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* Nabywca */}
          <div className="space-y-3">
            <Label>Nabywca</Label>
            <RadioGroup value={purchaserType} onValueChange={(value) => setPurchaserType(value as 'guest' | 'registered')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="guest" id="guest" />
                <Label htmlFor="guest">Gość</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="registered" id="registered" />
                <Label htmlFor="registered">Zarejestrowany użytkownik</Label>
              </div>
            </RadioGroup>

            {purchaserType === 'guest' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchaserName">Imię i nazwisko</Label>
                  <Input
                    id="purchaserName"
                    value={purchaserName}
                    onChange={(e) => setPurchaserName(e.target.value)}
                    placeholder="Jan Kowalski"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchaserEmail">Email</Label>
                  <Input
                    id="purchaserEmail"
                    type="email"
                    value={purchaserEmail}
                    onChange={(e) => setPurchaserEmail(e.target.value)}
                    placeholder="jan@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchaserPhone">Telefon</Label>
                  <Input
                    id="purchaserPhone"
                    value={purchaserPhone}
                    onChange={(e) => setPurchaserPhone(e.target.value)}
                    placeholder="+48 123 456 789"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="user">Wybierz użytkownika</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz użytkownika" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles
                      .filter(profile => profile.user_id && profile.user_id.trim() !== '')
                      .map((profile) => (
                        <SelectItem key={profile.user_id} value={profile.user_id}>
                          {profile.first_name} {profile.last_name}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Data wygaśnięcia */}
          <div className="space-y-2">
            <Label htmlFor="expiryDate">Data wygaśnięcia (opcjonalne)</Label>
            <Input
              id="expiryDate"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>

          {/* Notatki */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notatki (opcjonalne)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Dodatkowe informacje o bonie..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-4">
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
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}