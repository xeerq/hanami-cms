import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Search, User, Clock, Shield } from "lucide-react";

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
  user_email?: string;
  user_name?: string;
}

export const SecurityAuditLog = () => {
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [auditEntries, setAuditEntries] = useState<SecurityAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      fetchAuditEntries();
    }
  }, [isAdmin, adminLoading]);

  const fetchAuditEntries = async () => {
    try {
      // First, fetch audit entries without join
      const { data: auditData, error } = await supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching audit entries:', error);
        toast({
          title: "Błąd",
          description: "Nie udało się pobrać dziennika audytu",
          variant: "destructive",
        });
        return;
      }

      // Then, enrich data with user information
      const enrichedData = await Promise.all((auditData || []).map(async (entry) => {
        let userInfo = { email: '', name: '' };
        
        if (entry.user_id) {
          // Get profile data
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('user_id', entry.user_id)
              .maybeSingle();
            
            if (profileData?.first_name || profileData?.last_name) {
              userInfo.name = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim();
            }
          } catch (profileError) {
            console.log('Could not fetch profile:', profileError);
          }
          
          // Set a simple identifier for the user
          userInfo.email = `Użytkownik ${entry.user_id.substring(0, 8)}...`;
        }
        
        return {
          ...entry,
          user_email: userInfo.email,
          user_name: userInfo.name || userInfo.email || 'Nieznany użytkownik'
        };
      }));

      setAuditEntries(enrichedData);
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
        return 'Nadano uprawnienia';
      case 'role_revoked_enhanced':
        return 'Odebrano uprawnienia';
      case 'user_login':
        return 'Logowanie do systemu';
      case 'user_logout':
        return 'Wylogowanie z systemu';
      case 'profile_updated':
        return 'Zaktualizowano profil';
      case 'voucher_created':
        return 'Utworzono bon';
      case 'voucher_assigned':
        return 'Przypisano bon';
      case 'appointment_created':
        return 'Zarezerwowano wizytę';
      case 'appointment_updated':
        return 'Zmieniono wizytę';
      case 'team_member_created':
        return 'Dodano członka zespołu';
      case 'team_member_updated':
        return 'Zaktualizowano dane zespołu';
      case 'team_member_deleted':
        return 'Usunięto członka zespołu';
      case 'sensitive_data_access':
        return 'Dostęp do danych poufnych';
      case 'guest_contact_accessed':
        return 'Wyświetlono kontakt gościa';
      case 'voucher_purchaser_data_accessed':
        return 'Wyświetlono dane nabywcy bonu';
      case 'data_export':
        return 'Eksportowano dane';
      case 'page_view':
        return 'Odwiedzono stronę';
      case 'form_submission':
        return 'Wysłano formularz';
      case 'data_read':
        return 'Odczytano dane';
      case 'data_write':
        return 'Zapisano dane';
      case 'data_delete':
        return 'Usunięto dane';
      case 'error_occurred':
        return 'Wystąpił błąd';
      default:
        return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getActionDescription = (entry: SecurityAuditEntry) => {
    const { action, details, table_name } = entry;
    
    switch (action) {
      case 'user_login':
        return 'Użytkownik zalogował się do systemu';
      case 'user_logout':
        return 'Użytkownik wylogował się z systemu';
      case 'page_view':
        return `Użytkownik odwiedził stronę: ${details?.page || 'nieznana'}`;
      case 'form_submission':
        return `Wysłano formularz: ${details?.form_name || 'nieznany'}`;
      case 'appointment_created':
        return 'Zarezerwowano nową wizytę w systemie';
      case 'appointment_updated':
        return 'Zaktualizowano szczegóły wizyty';
      case 'voucher_created':
        return 'Utworzono nowy bon podarunkowy';
      case 'team_member_created':
        return 'Dodano nowego członka zespołu';
      case 'role_granted':
        return `Nadano rolę: ${details?.role || 'nieznana'}`;
      case 'role_revoked':
        return `Odebrano rolę: ${details?.role || 'nieznana'}`;
      case 'sensitive_data_access':
        return `Uzyskano dostęp do wrażliwych danych w tabeli: ${table_name}`;
      case 'data_export':
        return 'Wyeksportowano dane z systemu';
      default:
        return `Wykonano akcję: ${getActionLabel(action).toLowerCase()}`;
    }
  };

  // Filter entries based on search and action filter
  const filteredEntries = auditEntries.filter(entry => {
    const matchesSearch = searchTerm === '' || 
      entry.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getActionLabel(entry.action).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || entry.action === actionFilter;
    
    return matchesSearch && matchesAction;
  });

  // Get unique actions for filter dropdown
  const uniqueActions = Array.from(new Set(auditEntries.map(entry => entry.action)));

  if (adminLoading || !isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Dziennik Aktywności Systemu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Ładowanie dziennika aktywności...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Dziennik Aktywności Systemu
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Historia wszystkich ważnych działań wykonanych w systemie przez użytkowników
          </p>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj po użytkowniku lub działaniu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtruj działania" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie działania</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>
                    {getActionLabel(action)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Entries List */}
          <div className="space-y-4">
            {filteredEntries.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm || actionFilter !== 'all' 
                    ? 'Brak wyników dla podanych kryteriów' 
                    : 'Brak wpisów w dzienniku aktywności'}
                </p>
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={getActionColor(entry.action)} className="font-medium">
                          {getActionLabel(entry.action)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(entry.created_at), 'dd MMMM yyyy, HH:mm', { locale: pl })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{entry.user_name || 'System'}</span>
                        {entry.user_email && entry.user_email !== entry.user_name && (
                          <span className="text-muted-foreground">({entry.user_email})</span>
                        )}
                      </div>
                      
                      <p className="text-sm text-foreground">
                        {getActionDescription(entry)}
                      </p>
                      
                      {/* Additional details for some actions */}
                      {entry.details && Object.keys(entry.details).length > 0 && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Pokaż szczegóły techniczne
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                            {JSON.stringify(entry.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};