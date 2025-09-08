import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Shield, User, Mail, Key, Copy, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useActivityLogger } from "@/hooks/useActivityLogger";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
}

export const CreateUserDialog = ({ open, onOpenChange, onUserCreated }: CreateUserDialogProps) => {
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "result">("form");
  const [createdUserData, setCreatedUserData] = useState<any>(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    password: "",
    roles: [] as string[],
    sendWelcomeEmail: true
  });

  const generatePassword = () => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setFormData({ ...formData, password });
  };

  const toggleRole = (role: string) => {
    const newRoles = formData.roles.includes(role)
      ? formData.roles.filter(r => r !== role)
      : [...formData.roles, role];
    setFormData({ ...formData, roles: newRoles });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToClipboard(true);
      toast({
        title: "Skopiowano",
        description: "Hasło zostało skopiowane do schowka",
      });
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się skopiować hasła",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.firstName || !formData.lastName || !formData.password) {
      toast({
        title: "Błąd",
        description: "Wypełnij wszystkie wymagane pola",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create user using Supabase Admin API through edge function
      const { data: createUserResult, error: createError } = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email,
          password: formData.password,
          user_metadata: {
            first_name: formData.firstName,
            last_name: formData.lastName
          },
          phone: formData.phone || null,
          roles: formData.roles,
          sendWelcomeEmail: formData.sendWelcomeEmail
        }
      });

      if (createError) {
        throw createError;
      }

      if (createUserResult.error) {
        throw new Error(createUserResult.error);
      }

      // Log activity
      await logActivity({
        action: 'user_created',
        details: {
          description: `Utworzono nowego użytkownika: ${formData.email}`,
          email: formData.email,
          roles: formData.roles,
          created_by_admin: true
        }
      });

      setCreatedUserData({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        roles: formData.roles
      });

      setStep("result");

      toast({
        title: "Sukces",
        description: "Użytkownik został utworzony pomyślnie",
      });

    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się utworzyć użytkownika",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (step === "result") {
      onUserCreated();
    }
    setStep("form");
    setFormData({
      email: "",
      firstName: "",
      lastName: "",
      phone: "",
      password: "",
      roles: [],
      sendWelcomeEmail: true
    });
    setCreatedUserData(null);
    setCopiedToClipboard(false);
    onOpenChange(false);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'therapist':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="w-3 h-3" />;
      case 'therapist':
        return <Shield className="w-3 h-3" />;
      default:
        return <User className="w-3 h-3" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'therapist':
        return 'Terapeuta';
      default:
        return 'Użytkownik';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "form" ? "Utwórz nowego użytkownika" : "Użytkownik został utworzony"}
          </DialogTitle>
          <DialogDescription>
            {step === "form" 
              ? "Wypełnij formularz, aby utworzyć nowe konto użytkownika w systemie."
              : "Zapisz dane logowania użytkownika w bezpiecznym miejscu."
            }
          </DialogDescription>
        </DialogHeader>

        {step === "form" ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+48 123 456 789"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="firstName">Imię *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Jan"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Nazwisko *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Kowalski"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Hasło *</Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Wpisz hasło lub wygeneruj automatycznie"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generatePassword}
                >
                  <Key className="w-4 h-4 mr-2" />
                  Generuj
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Role użytkownika</Label>
              <div className="flex flex-wrap gap-2">
                {['admin', 'therapist'].map((role) => (
                  <div
                    key={role}
                    className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.roles.includes(role)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => toggleRole(role)}
                  >
                    {getRoleIcon(role)}
                    <span className="text-sm font-medium">{getRoleLabel(role)}</span>
                    {formData.roles.includes(role) && (
                      <CheckCircle className="w-4 h-4 text-primary" />
                    )}
                  </div>
                ))}
              </div>
              {formData.roles.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Jeśli nie wybierzesz żadnej roli, użytkownik otrzyma domyślne uprawnienia.
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="sendWelcomeEmail"
                checked={formData.sendWelcomeEmail}
                onCheckedChange={(checked) => setFormData({ ...formData, sendWelcomeEmail: checked })}
              />
              <Label htmlFor="sendWelcomeEmail">Wyślij email powitalny z danymi logowania</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                Anuluj
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Tworzenie..." : "Utwórz użytkownika"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Użytkownik został utworzony
                </CardTitle>
                <CardDescription>
                  Poniżej znajdują się dane logowania nowego użytkownika. Zapisz je w bezpiecznym miejscu.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                    <p className="text-sm font-mono bg-muted p-2 rounded">{createdUserData?.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Imię i nazwisko</Label>
                    <p className="text-sm font-mono bg-muted p-2 rounded">
                      {createdUserData?.firstName} {createdUserData?.lastName}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Hasło</Label>
                  <div className="flex gap-2">
                    <p className="text-sm font-mono bg-muted p-2 rounded flex-1">{createdUserData?.password}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(createdUserData?.password)}
                    >
                      {copiedToClipboard ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {createdUserData?.roles && createdUserData.roles.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Przyznane role</Label>
                    <div className="flex gap-2 mt-1">
                      {createdUserData.roles.map((role: string) => (
                        <Badge key={role} variant={getRoleBadgeVariant(role)} className="flex items-center gap-1">
                          {getRoleIcon(role)}
                          {getRoleLabel(role)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <DialogFooter>
              <Button onClick={handleClose}>
                Zamknij
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};