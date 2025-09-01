import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface LogActivityParams {
  action: string;
  tableName?: string;
  recordId?: string;
  details?: Record<string, any>;
}

export const useActivityLogger = () => {
  const { user } = useAuth();

  const logActivity = useCallback(async ({ 
    action, 
    tableName, 
    recordId, 
    details = {} 
  }: LogActivityParams) => {
    if (!user) return;

    try {
      const enhancedDetails = {
        ...details,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.pathname + window.location.search,
        referrer: document.referrer || null,
      };

      await supabase.rpc('log_security_event', {
        p_action: action,
        p_table_name: tableName,
        p_record_id: recordId,
        p_details: enhancedDetails
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }, [user]);

  // Specific logging functions for common activities
  const logLogin = useCallback(() => {
    logActivity({
      action: 'user_login',
      details: { source: 'web_app' }
    });
  }, [logActivity]);

  const logLogout = useCallback(() => {
    logActivity({
      action: 'user_logout',
      details: { source: 'web_app' }
    });
  }, [logActivity]);

  const logPageView = useCallback((pageName: string) => {
    logActivity({
      action: 'page_view',
      details: { 
        page: pageName,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    });
  }, [logActivity]);

  const logFormSubmission = useCallback((formName: string, formData?: Record<string, any>) => {
    logActivity({
      action: 'form_submission',
      details: { 
        form_name: formName,
        form_fields: formData ? Object.keys(formData) : []
      }
    });
  }, [logActivity]);

  const logDataAccess = useCallback((tableName: string, accessType: 'read' | 'write' | 'delete', recordId?: string) => {
    logActivity({
      action: `data_${accessType}`,
      tableName,
      recordId,
      details: { access_type: accessType }
    });
  }, [logActivity]);

  const logError = useCallback((errorType: string, errorMessage: string, context?: Record<string, any>) => {
    logActivity({
      action: 'error_occurred',
      details: {
        error_type: errorType,
        error_message: errorMessage,
        context
      }
    });
  }, [logActivity]);

  return {
    logActivity,
    logLogin,
    logLogout,
    logPageView,
    logFormSubmission,
    logDataAccess,
    logError
  };
};