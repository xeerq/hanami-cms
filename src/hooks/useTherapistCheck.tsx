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
      console.log("Has therapist role:", hasTherapistRole, "roleData:", roleData);
      setIsTherapist(hasTherapistRole);

      // If user is therapist, get therapist info from therapists table
      if (hasTherapistRole) {
        console.log("Finding therapist info for user:", user.id);
        
        // Najpierw sprawdź po user_id (nowy sposób po migracji)
        const { data: therapistData, error: therapistError } = await supabase
          .from("therapists")
          .select("id, name, specialization, experience, bio")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();
          
        console.log("Therapist data by user_id:", therapistData, therapistError);
        
        if (therapistData) {
          setTherapistInfo({ 
            therapist_id: therapistData.id, 
            name: therapistData.name,
            therapists: therapistData
          });
        } else {
          // Fallback: sprawdź po nazwie (stary sposób)
          const { data: profileData } = await supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("user_id", user.id)
            .maybeSingle();
            
          console.log("Profile data:", profileData);
          
          if (profileData) {
            const fullName = `${profileData.first_name} ${profileData.last_name}`;
            
            const { data: therapistByName } = await supabase
              .from("therapists")
              .select("id, name, specialization, experience, bio")
              .eq("name", fullName)
              .eq("is_active", true)
              .maybeSingle();
              
            console.log("Therapist data by name:", therapistByName);
            
            if (therapistByName) {
              setTherapistInfo({ 
                therapist_id: therapistByName.id, 
                name: therapistByName.name,
                therapists: therapistByName
              });
            } else {
              console.log("No matching therapist found, using fallback");
              setTherapistInfo({ therapist_id: user.id, name: fullName || "Masażysta" });
            }
          } else {
            console.log("No profile found, using fallback");
            setTherapistInfo({ therapist_id: user.id, name: "Masażysta" });
          }
        }
      } else {
        console.log("User is not a therapist, clearing therapist info");
        setTherapistInfo(null);
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