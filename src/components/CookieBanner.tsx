import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { Cookie, Settings, X } from 'lucide-react';
import { useCookieConsent } from '@/hooks/useCookieConsent';

const CookieBanner = () => {
  const { 
    showBanner, 
    acceptAll, 
    acceptNecessary, 
    acceptCustom,
    preferences 
  } = useCookieConsent();
  
  const [showSettings, setShowSettings] = useState(false);
  const [customPreferences, setCustomPreferences] = useState(preferences);

  if (!showBanner) return null;

  const handleCustomAccept = () => {
    acceptCustom(customPreferences);
    setShowSettings(false);
  };

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur-sm border-t border-border shadow-lg">
        <Card className="max-w-6xl mx-auto">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
              <div className="flex items-start gap-3 flex-1">
                <Cookie className="h-6 w-6 text-hanami-primary mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-hanami-primary mb-2">
                    Używamy plików cookie
                  </h3>
                  <p className="text-sm text-hanami-neutral leading-relaxed">
                    Ta strona używa plików cookie, aby zapewnić najlepsze doświadczenie użytkownika. 
                    Pliki cookie pomagają nam analizować ruch na stronie i personalizować treści. 
                    Możesz wybrać, które kategorie plików cookie chcesz zaakceptować.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowSettings(true)}
                  className="w-full sm:w-auto"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Ustawienia
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={acceptNecessary}
                  className="w-full sm:w-auto"
                >
                  Tylko niezbędne
                </Button>
                <Button 
                  size="sm"
                  onClick={acceptAll}
                  className="w-full sm:w-auto"
                >
                  Akceptuj wszystkie
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cookie Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5 text-hanami-primary" />
              Ustawienia plików cookie
            </DialogTitle>
            <DialogDescription>
              Wybierz, które kategorie plików cookie chcesz zaakceptować. 
              Pliki niezbędne są zawsze aktywne.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Necessary Cookies */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className="text-base font-semibold text-hanami-primary">
                    Pliki cookie niezbędne
                  </Label>
                  <p className="text-sm text-hanami-neutral mt-1">
                    Te pliki cookie są niezbędne do prawidłowego funkcjonowania strony 
                    i nie można ich wyłączyć.
                  </p>
                </div>
                <Switch checked={true} disabled />
              </div>
              <div className="text-xs text-hanami-neutral bg-hanami-accent/10 p-3 rounded-lg">
                <strong>Przykłady:</strong> uwierzytelnianie, bezpieczeństwo, 
                zapamiętywanie preferencji językowych
              </div>
            </div>

            {/* Analytics Cookies */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className="text-base font-semibold text-hanami-primary">
                    Pliki cookie analityczne
                  </Label>
                  <p className="text-sm text-hanami-neutral mt-1">
                    Pomagają nam zrozumieć, jak odwiedzający korzystają ze strony, 
                    dzięki czemu możemy ją ulepszać.
                  </p>
                </div>
                <Switch 
                  checked={customPreferences.analytics}
                  onCheckedChange={(checked) => 
                    setCustomPreferences(prev => ({ ...prev, analytics: checked }))
                  }
                />
              </div>
              <div className="text-xs text-hanami-neutral bg-hanami-accent/10 p-3 rounded-lg">
                <strong>Przykłady:</strong> Google Analytics, statystyki odwiedzin, 
                śledzenie popularnych stron
              </div>
            </div>

            {/* Marketing Cookies */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className="text-base font-semibold text-hanami-primary">
                    Pliki cookie marketingowe
                  </Label>
                  <p className="text-sm text-hanami-neutral mt-1">
                    Używane do śledzenia użytkowników na stronach internetowych w celu 
                    wyświetlania reklam dostosowanych do ich zainteresowań.
                  </p>
                </div>
                <Switch 
                  checked={customPreferences.marketing}
                  onCheckedChange={(checked) => 
                    setCustomPreferences(prev => ({ ...prev, marketing: checked }))
                  }
                />
              </div>
              <div className="text-xs text-hanami-neutral bg-hanami-accent/10 p-3 rounded-lg">
                <strong>Przykłady:</strong> Facebook Pixel, retargeting, 
                spersonalizowane reklamy
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowSettings(false)}
              className="w-full sm:w-auto"
            >
              Anuluj
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setCustomPreferences({
                  necessary: true,
                  analytics: false,
                  marketing: false,
                });
              }}
              className="w-full sm:w-auto"
            >
              Tylko niezbędne
            </Button>
            <Button 
              onClick={handleCustomAccept}
              className="w-full sm:w-auto"
            >
              Zapisz preferencje
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CookieBanner;