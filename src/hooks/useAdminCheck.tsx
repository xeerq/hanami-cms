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
    if (!user || authLoading) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      setIsAdmin(!!data);
    } catch (error: any) {
      console.error("Error checking admin role:", error);
      setIsAdmin(false);
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