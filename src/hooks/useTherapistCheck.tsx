import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useTherapistCheck = () => {
  const { user, loading: authLoading } = useAuth();
  const [isTherapist, setIsTherapist] = useState(false);
  const [therapistInfo, setTherapistInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkTherapistRole();
  }, [user]);

  const checkTherapistRole = async () => {
    if (authLoading) {
      return;
    }
    
    if (!user) {
      setIsTherapist(false);
      setLoading(false);
      return;
    }

    try {
      console.log("Checking therapist role for user:", user.id);
      
      // Check if user has therapist role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "therapist")
        .maybeSingle();

      console.log("Role check result:", { roleData, roleError });

      if (roleError && roleError.code !== "PGRST116") {
        throw roleError;
      }

      const hasTherapistRole = !!roleData;
      setIsTherapist(hasTherapistRole);

      // If user is therapist, get therapist info from user_roles for now
      if (hasTherapistRole) {
        // For now, we'll use a simple approach since therapist_users table is new
        setTherapistInfo({ therapist_id: user.id, name: "Masażysta" });
      }
    } catch (error: any) {
      console.error("Error checking therapist role:", error);
      setIsTherapist(false);
    } finally {
      setLoading(false);
    }
  };

  const requireTherapist = () => {
    if (!isTherapist && !loading) {
      toast({
        title: "Brak uprawnień",
        description: "Nie masz uprawnień masażysty",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  return {
    isTherapist,
    therapistInfo,
    loading: loading || authLoading,
    requireTherapist,
    checkTherapistRole
  };
};