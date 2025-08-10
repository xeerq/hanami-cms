import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Users, Mail } from "lucide-react";

export function NotificationManager() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'newsletter',
    subject: '',
    message: '',
    recipients: '',
    sendToAll: false
  });
  const { toast } = useToast();

  const handleSendNotification = async () => {
    if (!formData.subject || !formData.message) {
      toast({
        title: "Błąd",
        description: "Wypełnij temat i treść wiadomości",
        variant: "destructive",
      });
      return;
    }

    if (!formData.sendToAll && !formData.recipients.trim()) {
      toast({
        title: "Błąd", 
        description: "Podaj adresy email lub wybierz wysyłanie do wszystkich",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        type: formData.type,
        subject: formData.subject,
        message: formData.message
      };

      if (formData.sendToAll) {
        payload.all_users = true;
      } else {
        payload.recipients = formData.recipients
          .split(',')
          .map(email => email.trim())
          .filter(email => email);
      }

      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: payload
      });

      if (error) throw error;

      toast({
        title: "Sukces",
        description: `Wysłano wiadomości: ${data.sent} udanych, ${data.failed} nieudanych`,
      });

      // Reset form
      setFormData({
        type: 'newsletter',
        subject: '',
        message: '',
        recipients: '',
        sendToAll: false
      });

    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się wysłać powiadomień",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            System powiadomień i marketingu
          </CardTitle>
          <CardDescription>
            Wysyłaj powiadomienia, newslettery i wiadomości marketingowe do klientów
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Typ wiadomości</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newsletter">Newsletter</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="appointment_reminder">Przypomnienie o wizycie</SelectItem>
                  <SelectItem value="appointment_confirmation">Potwierdzenie wizyty</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subject">Temat wiadomości</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Wpisz temat..."
              />
            </div>
          </div>

          <div>
            <Label htmlFor="message">Treść wiadomości</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Wpisz treść wiadomości..."
              rows={6}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="sendToAll"
                checked={formData.sendToAll}
                onChange={(e) => setFormData(prev => ({ ...prev, sendToAll: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="sendToAll" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Wyślij do wszystkich użytkowników
              </Label>
            </div>

            {!formData.sendToAll && (
              <div>
                <Label htmlFor="recipients">Adresy email (oddziel przecinkami)</Label>
                <Textarea
                  id="recipients"
                  value={formData.recipients}
                  onChange={(e) => setFormData(prev => ({ ...prev, recipients: e.target.value }))}
                  placeholder="email1@example.com, email2@example.com..."
                  rows={3}
                />
              </div>
            )}
          </div>

          <Button 
            onClick={handleSendNotification} 
            disabled={loading}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {loading ? 'Wysyłanie...' : 'Wyślij powiadomienia'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Szybkie szablony</CardTitle>
          <CardDescription>
            Kliknij aby użyć gotowego szablonu
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            variant="outline"
            onClick={() => setFormData(prev => ({
              ...prev,
              type: 'newsletter',
              subject: 'Nowości w Hanami Spa',
              message: 'Witamy w najnowszym wydaniu naszego newslettera!\n\nW tym miesiącu przedstawiamy Wam nasze najnowsze usługi i promocje...'
            }))}
          >
            Newsletter
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setFormData(prev => ({
              ...prev,
              type: 'marketing',
              subject: 'Specjalna promocja - 20% zniżki',
              message: 'Mamy dla Ciebie wyjątkową ofertę!\n\n20% zniżki na wszystkie masaże do końca miesiąca. Zarezerwuj już dziś!'
            }))}
          >
            Promocja
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setFormData(prev => ({
              ...prev,
              type: 'appointment_reminder',
              subject: 'Przypomnienie o jutrzejszej wizycie',
              message: 'Przypominamy o Twojej wizycie jutro w Hanami Spa.\n\nZgłoś się 10 minut przed terminem.'
            }))}
          >
            Przypomnienie
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setFormData(prev => ({
              ...prev,
              type: 'marketing',
              subject: 'Nowe usługi w Hanami Spa',
              message: 'Zapraszamy do zapoznania się z naszymi nowymi usługami!\n\nOddaj się relaksowi w naszym spa...'
            }))}
          >
            Nowe usługi
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}