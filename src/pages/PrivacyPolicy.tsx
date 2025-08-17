import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const PrivacyPolicy = () => {
  const [privacyPolicy, setPrivacyPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPrivacyPolicy();
  }, []);

  const fetchPrivacyPolicy = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'privacy_policy')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPrivacyPolicy(data.value);
      }
    } catch (error: any) {
      console.error('Error fetching privacy policy:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się załadować polityki prywatności',
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
              {privacyPolicy?.title || 'Polityka Prywatności'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-hanami max-w-none">
              {privacyPolicy?.content ? (
                <div className="whitespace-pre-wrap text-hanami-neutral leading-relaxed">
                  {privacyPolicy.content}
                </div>
              ) : (
                <div className="text-center text-hanami-neutral py-8">
                  <p>Polityka prywatności nie została jeszcze skonfigurowana.</p>
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

export default PrivacyPolicy;