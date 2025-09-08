import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { validateEmail, validatePhone, sanitizeInput } from "@/lib/security";

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

      // Update auth user email using service function
      if (email !== user.email) {
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
            description: "Nie udało się zaktualizować adresu email",
            variant: "destructive",
          });
          return;
        }
      }

      // Update profile data with sanitized inputs
      const { data: updatedProfile, error } = await supabase
        .from("profiles")
        .update({
          first_name: sanitizedFirstName,
          last_name: sanitizedLastName,
          phone: sanitizedPhone
        })
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        console.error("Profile update error:", error);
        throw error;
      }

      console.log("Profile updated successfully:", updatedProfile);

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
        description: "Nie udało się zaktualizować danych użytkownika",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edytuj użytkownika</DialogTitle>
          <DialogDescription>
            Edytuj podstawowe dane użytkownika. Zmiany zostaną zapisane w profilu.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-sm text-muted-foreground">
                Status email
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  emailConfirmed 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                }`}>
                  {emailConfirmed ? '✓ Potwierdzony' : '⚠ Niepotwierdzony'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="firstName" className="text-right">
                Imię
              </Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lastName" className="text-right">
                Nazwisko
              </Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Telefon
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="col-span-3"
                placeholder="np. +48 123 456 789"
              />
            </div>

            {user && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-sm text-muted-foreground">
                    Data utworzenia
                  </Label>
                  <div className="col-span-3 text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleString('pl-PL')}
                  </div>
                </div>

                {user.last_sign_in_at && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right text-sm text-muted-foreground">
                      Ostatnie logowanie
                    </Label>
                    <div className="col-span-3 text-sm text-muted-foreground">
                      {new Date(user.last_sign_in_at).toLocaleString('pl-PL')}
                    </div>
                  </div>
                )}

                {user.profile?.created_at && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right text-sm text-muted-foreground">
                      Profil utworzony
                    </Label>
                    <div className="col-span-3 text-sm text-muted-foreground">
                      {new Date(user.profile.created_at).toLocaleString('pl-PL')}
                    </div>
                  </div>
                )}

                {user.profile?.updated_at && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right text-sm text-muted-foreground">
                      Profil zaktualizowany
                    </Label>
                    <div className="col-span-3 text-sm text-muted-foreground">
                      {new Date(user.profile.updated_at).toLocaleString('pl-PL')}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-sm text-muted-foreground">
                    ID użytkownika
                  </Label>
                  <div className="col-span-3 text-xs font-mono text-muted-foreground break-all">
                    {user.id}
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
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