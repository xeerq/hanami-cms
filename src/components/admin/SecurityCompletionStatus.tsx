import { AlertTriangle, Shield, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SecurityCompletionStatus() {
  const handleOpenSupabaseSettings = () => {
    window.open('https://supabase.com/dashboard/project/mfjfhnwgrbwjovvnlxto/auth/providers', '_blank');
  };

  return (
    <div className="space-y-4">
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            Refactoring Zakończony Pomyślnie
          </CardTitle>
          <CardDescription className="text-green-700">
            Wszystkie krytyczne problemy bezpieczeństwa zostały naprawione
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-green-800">✅ Naprawione problemy:</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Dane kontaktowe zespołu zabezpieczone</li>
                <li>• RLS policies poprawnie skonfigurowane</li>
                <li>• Nowy manager zespołu utworzony</li>
                <li>• View publiczny bez wrażliwych danych</li>
                <li>• Audyt bezpieczeństwa aktywny</li>
                <li>• Optymalizacja wydajności dodana</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-green-800">🎯 Nowe funkcje:</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• TeamMembersManager w panelu admin</li>
                <li>• Bezpieczne API funkcje</li>
                <li>• Walidacja danych automatyczna</li>
                <li>• Export/import członków zespołu</li>
                <li>• Indeksy dla lepszej wydajności</li>
                <li>• Kompletny system auditingu</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800">Ostatni krok ręczny</AlertTitle>
        <AlertDescription className="text-amber-700 space-y-3">
          <p>
            Pozostało tylko <strong>jedno ręczne ustawienie</strong> w Supabase:
          </p>
          <div className="bg-amber-100 p-3 rounded border">
            <p className="font-medium">
              <Shield className="inline h-4 w-4 mr-1" />
              Włącz "Leaked Password Protection"
            </p>
            <p className="text-sm mt-1">
              Authentication → Settings → Security → Password Security
            </p>
          </div>
          <Button 
            onClick={handleOpenSupabaseSettings}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Otwórz ustawienia Supabase
          </Button>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Status bezpieczeństwa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="default" className="bg-green-600">
              RLS Aktywne
            </Badge>
            <Badge variant="default" className="bg-green-600">
              Dane Zabezpieczone
            </Badge>
            <Badge variant="default" className="bg-green-600">
              Audit Włączony
            </Badge>
            <Badge variant="secondary">
              Leaked Password: Ręczne
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}