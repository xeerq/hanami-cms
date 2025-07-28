import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RedeemVoucherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voucher: {
    id: string;
    code: string;
    voucher_type: 'single' | 'package';
    service_id?: string;
    original_value?: number;
    remaining_value?: number;
    original_sessions: number;
    remaining_sessions: number;
    services?: {
      name: string;
    };
  };
  onSuccess: () => void;
}

interface Profile {
  user_id: string;
  first_name?: string;
  last_name?: string;
}

export function RedeemVoucherDialog({ open, onOpenChange, voucher, onSuccess }: RedeemVoucherDialogProps) {
  const [redemptionType, setRedemptionType] = useState<'user' | 'guest'>('user');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [redeemValue, setRedeemValue] = useState('');
  const [redeemSessions, setRedeemSessions] = useState('1');
  const [notes, setNotes] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadProfiles();
      // Set default values
      if (voucher.voucher_type === 'single') {
        setRedeemValue(voucher.remaining_value?.toString() || '0');
      } else {
        setRedeemSessions('1');
      }
    }
  }, [open, voucher]);

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .order('first_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować profili użytkowników",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setRedemptionType('user');
    setSelectedUserId('');
    setRedeemValue('');
    setRedeemSessions('1');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const redemptionValue = voucher.voucher_type === 'single' 
        ? parseFloat(redeemValue) 
        : null;
      
      const redemptionSessions = voucher.voucher_type === 'package' 
        ? parseInt(redeemSessions) 
        : 1;

      // Validate redemption amounts
      if (voucher.voucher_type === 'single') {
        if (redemptionValue! > voucher.remaining_value!) {
          throw new Error('Kwota realizacji przekracza pozostałą wartość bonu');
        }
      } else {
        if (redemptionSessions > voucher.remaining_sessions) {
          throw new Error('Liczba sesji przekracza pozostałą liczbę w pakiecie');
        }
      }

      // Create redemption record
      const redemptionData = {
        voucher_id: voucher.id,
        redeemed_by: redemptionType === 'user' ? selectedUserId : null,
        redeemed_value: redemptionValue,
        redeemed_sessions: redemptionSessions,
        notes: notes || null
      };

      const { error: redemptionError } = await supabase
        .from('voucher_redemptions')
        .insert(redemptionData);

      if (redemptionError) throw redemptionError;

      // Update voucher remaining amounts
      const updateData: any = {};
      
      if (voucher.voucher_type === 'single') {
        const newRemainingValue = voucher.remaining_value! - redemptionValue!;
        updateData.remaining_value = newRemainingValue;
        if (newRemainingValue <= 0) {
          updateData.status = 'redeemed';
        }
      } else {
        const newRemainingSessions = voucher.remaining_sessions - redemptionSessions;
        updateData.remaining_sessions = newRemainingSessions;
        if (newRemainingSessions <= 0) {
          updateData.status = 'redeemed';
        }
      }

      const { error: updateError } = await supabase
        .from('vouchers')
        .update(updateData)
        .eq('id', voucher.id);

      if (updateError) throw updateError;

      toast({
        title: "Sukces",
        description: `Bon ${voucher.code} został zrealizowany`,
      });

      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error redeeming voucher:', error);
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zrealizować bonu",
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
          <DialogTitle>Realizacja bonu podarunkowego</DialogTitle>
          <DialogDescription>
            Zrealizuj bon {voucher.code}
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle>Informacje o bonie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium">Kod:</span>
                <div className="font-mono">{voucher.code}</div>
              </div>
              <div>
                <span className="text-sm font-medium">Typ:</span>
                <div>{voucher.voucher_type === 'single' ? 'Pojedynczy' : 'Pakiet'}</div>
              </div>
              <div>
                <span className="text-sm font-medium">Usługa:</span>
                <div>{voucher.services?.name || 'Wszystkie'}</div>
              </div>
              <div>
                <span className="text-sm font-medium">Pozostało:</span>
                <div>
                  {voucher.voucher_type === 'single' 
                    ? `${voucher.remaining_value} zł`
                    : `${voucher.remaining_sessions} sesji`
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="redemptionType">Kto realizuje bon?</Label>
            <Select 
              value={redemptionType} 
              onValueChange={(value) => setRedemptionType(value as 'user' | 'guest')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Zarejestrowany użytkownik</SelectItem>
                <SelectItem value="guest">Gość</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {redemptionType === 'user' && (
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

          <div className="grid grid-cols-2 gap-4">
            {voucher.voucher_type === 'single' ? (
              <div className="space-y-2">
                <Label htmlFor="redeemValue">Kwota do realizacji (zł)</Label>
                <Input
                  id="redeemValue"
                  type="number"
                  min="0"
                  max={voucher.remaining_value}
                  step="0.01"
                  value={redeemValue}
                  onChange={(e) => setRedeemValue(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="redeemSessions">Liczba sesji do realizacji</Label>
                <Input
                  id="redeemSessions"
                  type="number"
                  min="1"
                  max={voucher.remaining_sessions}
                  value={redeemSessions}
                  onChange={(e) => setRedeemSessions(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notatki (opcjonalne)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Dodatkowe informacje o realizacji..."
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
              {loading ? "Realizowanie..." : "Zrealizuj bon"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}