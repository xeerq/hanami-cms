import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string, phone?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Log authentication events (but not during signout to avoid errors)
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            await supabase.rpc('log_security_event', {
              p_action: 'user_login',
              p_table_name: null,
              p_record_id: null,
              p_details: {
                event_type: 'SIGNED_IN',
                user_agent: navigator.userAgent,
                timestamp: new Date().toISOString()
              }
            });
          } catch (error) {
            console.error('Error logging login event:', error);
          }
        }
        // Note: Don't log SIGNED_OUT event here as user is already signed out
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string, phone?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone,
          }
        }
      });

      if (error) {
        toast({
          title: "Błąd rejestracji",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sukces!",
          description: "Konto zostało utworzone. Sprawdź swoją skrzynkę pocztową i potwierdź adres email.",
        });
      }

      return { error };
    } catch (error: any) {
      toast({
        title: "Błąd rejestracji",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Błąd logowania",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Witaj!",
          description: "Zalogowano pomyślnie.",
        });
      }

      return { error };
    } catch (error: any) {
      toast({
        title: "Błąd logowania",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('Starting signOut process...');
      
      // Log logout event BEFORE signing out while user is still authenticated
      if (user) {
        try {
          await supabase.rpc('log_security_event', {
            p_action: 'user_logout',
            p_table_name: null,
            p_record_id: null,
            p_details: {
              event_type: 'MANUAL_LOGOUT',
              timestamp: new Date().toISOString()
            }
          });
        } catch (logError) {
          console.error('Error logging logout event:', logError);
        }
      }

      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('SignOut error:', error);
        toast({
          title: "Błąd wylogowania",
          description: error.message,
          variant: "destructive",
        });
      } else {
        console.log('SignOut successful');
        toast({
          title: "Do zobaczenia!",
          description: "Wylogowano pomyślnie.",
        });
      }

      return { error };
    } catch (error: any) {
      console.error('Unexpected error during signOut:', error);
      toast({
        title: "Błąd wylogowania",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: "Błąd",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email wysłany",
          description: "Sprawdź swoją skrzynkę pocztową w celu zresetowania hasła.",
        });
      }

      return { error };
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};