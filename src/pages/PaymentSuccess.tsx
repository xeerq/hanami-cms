import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ShoppingBag, Gift } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const [processing, setProcessing] = useState(true);
  const [orderDetails, setOrderDetails] = useState<{
    id: string;
    total_amount: number;
    status: string;
    created_at: string;
  } | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const processPaymentEffect = async () => {
      if (!sessionId || !user) return;
      
      try {
        const { data, error } = await supabase.functions.invoke('process-voucher-purchase', {
          body: {
            sessionId,
            userId: user.id
          }
        });

        if (error) throw error;

        // Get order details from the response instead of separate query
        if (data?.order) {
          setOrderDetails(data.order);
        }
        
        if (data?.vouchersCreated > 0) {
          toast({
            title: "Płatność zakończona sukcesem!",
            description: `Utworzono ${data.vouchersCreated} bonów podarunkowych`,
          });
        } else {
          toast({
            title: "Płatność zakończona sukcesem!",
            description: "Twoje zamówienie zostało przetworzone",
          });
        }
      } catch (error: any) {
        console.error('Error processing payment:', error);
        toast({
          title: "Błąd przetwarzania",
          description: "Wystąpił problem z przetwarzaniem płatności",
          variant: "destructive",
        });
      } finally {
        setProcessing(false);
      }
    };

    processPaymentEffect();
  }, [sessionId, user?.id]);

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Header />
      
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="text-center">
            <CardHeader>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-hanami-primary">
                {processing ? "Przetwarzanie płatności..." : "Płatność zakończona sukcesem!"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {processing ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hanami-primary mx-auto"></div>
              ) : (
                <>
                  <p className="text-hanami-neutral">
                    Dziękujemy za zakup! Twoje zamówienie zostało przetworzone.
                  </p>
                  
                  {orderDetails && (
                    <div className="bg-hanami-cream p-6 rounded-lg">
                      <h3 className="font-semibold text-hanami-primary mb-4">Szczegóły zamówienia</h3>
                      <div className="text-left space-y-2">
                        <div className="flex justify-between">
                          <span>Numer zamówienia:</span>
                          <span className="font-mono">{orderDetails.id.slice(0, 8)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Kwota:</span>
                          <span className="font-semibold">{orderDetails.total_amount} PLN</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className="text-green-600 font-semibold">Opłacone</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <Button 
                      onClick={() => navigate('/dashboard')}
                      className="w-full sm:w-auto"
                    >
                      <Gift className="h-4 w-4 mr-2" />
                      Sprawdź swoje bony
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => navigate('/shop')}
                      className="w-full sm:w-auto ml-0 sm:ml-2"
                    >
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Wróć do sklepu
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PaymentSuccess;