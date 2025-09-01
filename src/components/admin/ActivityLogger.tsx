import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { useAuth } from "@/contexts/AuthContext";

export const ActivityLogger = () => {
  const location = useLocation();
  const { logPageView } = useActivityLogger();
  const { user } = useAuth();

  useEffect(() => {
    if (user && location.pathname) {
      const pageName = location.pathname.replace(/^\//, '') || 'home';
      logPageView(pageName);
    }
  }, [location.pathname, user, logPageView]);

  return null;
};