import { AlertTriangle, Shield } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function SecurityStatusAlert() {
  const handleOpenSupabaseSettings = () => {
    window.open('https://supabase.com/dashboard/project/mfjfhnwgrbwjovvnlxto/auth/providers', '_blank');
  };

  return (
    <Alert className="border-amber-200 bg-amber-50">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800">Manual Security Configuration Required</AlertTitle>
      <AlertDescription className="text-amber-700 space-y-2">
        <p>
          The database security fixes have been implemented, but one manual step remains:
        </p>
        <p className="font-medium">
          <Shield className="inline h-4 w-4 mr-1" />
          Enable "Leaked Password Protection" in your Supabase project settings.
        </p>
        <div className="mt-3">
          <Button 
            onClick={handleOpenSupabaseSettings}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Open Supabase Auth Settings
          </Button>
        </div>
        <p className="text-sm mt-2">
          Navigate to Authentication → Settings → Security and enable "Leaked Password Protection"
        </p>
      </AlertDescription>
    </Alert>
  );
}