import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const AuthConfirm = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const confirmUser = async () => {
      const token_hash = searchParams.get('token_hash');
      const type = searchParams.get('type');
      const redirect_to = searchParams.get('redirect_to');

      if (!token_hash || !type) {
        setStatus('error');
        setMessage('Nieprawidłowy link potwierdzenia');
        return;
      }

      try {
        let result;
        
        if (type === 'signup') {
          result = await supabase.auth.verifyOtp({
            token_hash,
            type: 'signup'
          });
        } else if (type === 'recovery') {
          result = await supabase.auth.verifyOtp({
            token_hash,
            type: 'recovery'
          });
        } else {
          throw new Error('Nieznany typ potwierdzenia');
        }

        if (result.error) {
          throw result.error;
        }

        setStatus('success');
        
        if (type === 'signup') {
          setMessage('Konto zostało pomyślnie aktywowane! Możesz się teraz zalogować.');
          toast({
            title: "Sukces",
            description: "Konto zostało aktywowane",
          });
          
          // Redirect to auth page after 3 seconds
          setTimeout(() => {
            navigate('/auth');
          }, 3000);
        } else if (type === 'recovery') {
          setMessage('Email został potwierdzony. Możesz teraz ustawić nowe hasło.');
          toast({
            title: "Sukces", 
            description: "Email został potwierdzony",
          });
          
          // Redirect to reset password page
          setTimeout(() => {
            navigate('/auth/reset-password');
          }, 2000);
        }

      } catch (error: any) {
        console.error('Email confirmation error:', error);
        setStatus('error');
        setMessage(error.message || 'Wystąpił błąd podczas potwierdzania email');
        
        toast({
          title: "Błąd",
          description: "Nie udało się potwierdzić email",
          variant: "destructive",
        });
      }
    };

    confirmUser();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Header />
      
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 mb-4">
                {status === 'loading' && (
                  <Loader2 className="w-12 h-12 text-hanami-primary animate-spin" />
                )}
                {status === 'success' && (
                  <CheckCircle className="w-12 h-12 text-green-600" />
                )}
                {status === 'error' && (
                  <XCircle className="w-12 h-12 text-red-600" />
                )}
              </div>
              
              <CardTitle>
                {status === 'loading' && 'Potwierdzanie email...'}
                {status === 'success' && 'Email potwierdzony!'}
                {status === 'error' && 'Błąd potwierdzenia'}
              </CardTitle>
              
              <CardDescription>
                {message}
              </CardDescription>
            </CardHeader>
            
            {status === 'success' && (
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  Przekierowujemy Cię automatycznie...
                </p>
              </CardContent>
            )}
            
            {status === 'error' && (
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Spróbuj ponownie lub skontaktuj się z obsługą klienta.
                </p>
                <button
                  onClick={() => navigate('/auth')}
                  className="text-hanami-primary hover:underline"
                >
                  Wróć do logowania
                </button>
              </CardContent>
            )}
          </Card>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default AuthConfirm;