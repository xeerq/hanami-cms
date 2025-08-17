import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const TermsOfService = () => {
  const [termsOfService, setTermsOfService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTermsOfService();
  }, []);

  const fetchTermsOfService = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'terms_of_service')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setTermsOfService(data.value);
      }
    } catch (error: any) {
      console.error('Error fetching terms of service:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się załadować regulaminu',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hanami-primary mx-auto"></div>
            <p className="mt-2 text-hanami-neutral">Ładowanie...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl text-hanami-primary text-center">
              {termsOfService?.title || 'Regulamin świadczenia usług'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-hanami max-w-none">
              {termsOfService?.content ? (
                <div className="whitespace-pre-wrap text-hanami-neutral leading-relaxed">
                  {termsOfService.content}
                </div>
              ) : (
                <div className="text-center text-hanami-neutral py-8">
                  <p>Regulamin nie został jeszcze skonfigurowany.</p>
                  <p className="text-sm mt-2">
                    Skontaktuj się z administratorem strony.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfService;