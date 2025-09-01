import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { format } from "date-fns";

interface SecurityAuditEntry {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  details: any;
  ip_address: unknown;
  user_agent: string | null;
  created_at: string;
}

export const SecurityAuditLog = () => {
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [auditEntries, setAuditEntries] = useState<SecurityAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      fetchAuditEntries();
    }
  }, [isAdmin, adminLoading]);

  const fetchAuditEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching audit entries:', error);
        toast({
          title: "Błąd",
          description: "Nie udało się pobrać dziennika audytu",
          variant: "destructive",
        });
        return;
      }

      setAuditEntries(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Błąd",
        description: "Wystąpił nieoczekiwany błąd",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'role_granted':
      case 'role_granted_enhanced':
        return 'default';
      case 'role_revoked':
      case 'role_revoked_enhanced':
        return 'destructive';
      case 'role_changed':
        return 'secondary';
      case 'login':
      case 'profile_updated':
        return 'default';
      case 'voucher_created':
      case 'voucher_assigned':
        return 'secondary';
      case 'appointment_created':
      case 'appointment_updated':
        return 'default';
      case 'team_member_created':
      case 'team_member_updated':
        return 'secondary';
      case 'sensitive_data_access':
      case 'guest_contact_accessed':
        return 'destructive';
      case 'data_export':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'role_granted':
        return 'Nadano rolę';
      case 'role_revoked':
        return 'Odebrano rolę';
      case 'role_changed':
        return 'Zmieniono rolę';
      case 'role_granted_enhanced':
        return 'Nadano rolę (rozszerzony)';
      case 'role_revoked_enhanced':
        return 'Odebrano rolę (rozszerzony)';
      case 'login':
        return 'Logowanie';
      case 'profile_updated':
        return 'Aktualizacja profilu';
      case 'voucher_created':
        return 'Utworzono bon';
      case 'voucher_assigned':
        return 'Przypisano bon';
      case 'appointment_created':
        return 'Utworzono wizytę';
      case 'appointment_updated':
        return 'Zaktualizowano wizytę';
      case 'team_member_created':
        return 'Dodano członka zespołu';
      case 'team_member_updated':
        return 'Zaktualizowano członka zespołu';
      case 'team_member_deleted':
        return 'Usunięto członka zespołu';
      case 'sensitive_data_access':
        return 'Dostęp do danych wrażliwych';
      case 'guest_contact_accessed':
        return 'Dostęp do kontaktu gościa';
      case 'voucher_purchaser_data_accessed':
        return 'Dostęp do danych nabywcy bonu';
      case 'data_export':
        return 'Eksport danych';
      default:
        return action.replace(/_/g, ' ');
    }
  };

  if (adminLoading || !isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dziennik Audytu Bezpieczeństwa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Ładowanie...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dziennik Audytu Bezpieczeństwa</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {auditEntries.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Brak wpisów w dzienniku audytu
            </div>
          ) : (
            auditEntries.map((entry) => (
              <div key={entry.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant={getActionColor(entry.action)}>
                    {getActionLabel(entry.action)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(entry.created_at), 'dd.MM.yyyy HH:mm:ss')}
                  </span>
                </div>
                
                {entry.table_name && (
                  <div className="text-sm">
                    <span className="font-medium">Tabela:</span> {entry.table_name}
                  </div>
                )}
                
                {entry.user_id && (
                  <div className="text-sm">
                    <span className="font-medium">Użytkownik:</span> {entry.user_id}
                  </div>
                )}
                
                {entry.details && Object.keys(entry.details).length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium">Szczegóły:</span>
                    <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                      {JSON.stringify(entry.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};