import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useAdminCheck = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkAdminRole();
  }, [user]);

  const checkAdminRole = async () => {
    if (authLoading) {
      return;
    }
    
    if (!user) {
      console.log("No user found, setting isAdmin to false");
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      console.log("Checking admin role for user:", user.id);
      
      // Use the has_role function instead of direct table access
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      console.log("Admin role check result (has_role):", { data, error });

      if (error) {
        console.error("Admin role check error:", error);
        throw error;
      }

      const hasAdminRole = data === true;
      console.log("Setting isAdmin to:", hasAdminRole);
      setIsAdmin(hasAdminRole);
    } catch (error: any) {
      console.error("Error checking admin role:", error);
      // Fallback to direct table query if RPC fails
      try {
        console.log("Trying fallback query...");
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        console.log("Fallback query result:", { fallbackData, fallbackError });
        
        if (!fallbackError) {
          setIsAdmin(!!fallbackData);
        } else {
          setIsAdmin(false);
        }
      } catch (fallbackErr) {
        console.error("Fallback query also failed:", fallbackErr);
        setIsAdmin(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const requireAdmin = () => {
    if (!isAdmin && !loading) {
      toast({
        title: "Brak uprawnień",
        description: "Nie masz uprawnień administratora",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  return {
    isAdmin,
    loading: loading || authLoading,
    requireAdmin,
    checkAdminRole
  };
};