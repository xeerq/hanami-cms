import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Crown, Shield, Users, UserX, UserCheck, Ban, CheckCircle, Edit } from "lucide-react";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { EditUserDialog } from "./EditUserDialog";

interface User {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  user_metadata: {
    first_name?: string;
    last_name?: string;
  };
  phone?: string;
  is_banned?: boolean;
  roles?: string[];
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

const UsersManager = () => {
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [users, setUsers] = useState<User[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, adminLoading]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Use Supabase client to invoke edge function securely
      const { data: userData, error: functionError } = await supabase.functions.invoke('get-user-data', {
        body: { type: 'users' }
      });
      
      if (functionError) {
        console.error('Function error:', functionError);
        throw new Error(`Edge function error: ${functionError.message}`);
      }
      
      console.log('Received user data:', userData);
      
      // Map users and check banned status from the new format
      const usersWithBanStatus = userData?.users?.map((user: any) => ({
        ...user,
        is_banned: user.is_banned || false
      })) || [];
      
      setUsers(usersWithBanStatus);
      
      // User roles are now included in the user data
      const allRoles = userData?.users?.flatMap((user: any) => 
        user.roles?.map((role: string) => ({
          id: `${user.id}-${role}`,
          user_id: user.id,
          role: role
        })) || []
      ) || [];
      
      setUserRoles(allRoles);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować użytkowników",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getUserRoles = (userId: string): string[] => {
    return userRoles
      .filter(role => role.user_id === userId)
      .map(role => role.role);
  };

  const addRole = async (userId: string, role: 'admin' | 'therapist' | 'user') => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: role as 'admin' | 'therapist' | 'user'
        });

      if (error) throw error;

      const user = users.find(u => u.id === userId);
      await logActivity({
        action: 'user_role_granted',
        details: {
          description: `Przyznano rolę ${role} użytkownikowi: ${user?.email}`,
          user_id: userId,
          role: role
        }
      });

      toast({
        title: "Sukces",
        description: role === 'therapist' 
          ? `Rola ${role} została przyznana i automatycznie utworzono profil terapeuty`
          : `Rola ${role} została przyznana`,
      });

      fetchUsers();
    } catch (error: any) {
      console.error("Error adding role:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się przyznać roli",
        variant: "destructive",
      });
    }
  };

  const removeRole = async (userId: string, role: 'admin' | 'therapist' | 'user') => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role as 'admin' | 'therapist' | 'user');

      if (error) throw error;

      const user = users.find(u => u.id === userId);
      await logActivity({
        action: 'user_role_revoked',
        details: {
          description: `Odebrano rolę ${role} użytkownikowi: ${user?.email}`,
          user_id: userId,
          role: role
        }
      });

      toast({
        title: "Sukces",
        description: role === 'therapist' 
          ? `Rola ${role} została odebrana i automatycznie usunięto profil terapeuty`
          : `Rola ${role} została odebrana`,
      });

      fetchUsers();
    } catch (error: any) {
      console.error("Error removing role:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się odebrać roli",
        variant: "destructive",
      });
    }
  };

  const banUser = async (userId: string, userEmail: string) => {
    try {
      const { data, error } = await supabase.rpc('ban_user', {
        user_id: userId,
        ban_duration_hours: 8760 // 1 year
      });

      if (error) throw error;

      await logActivity({
        action: 'user_account_banned',
        details: {
          description: `Zablokowano konto użytkownika: ${userEmail}`,
          banned_user_id: userId,
          ban_duration: '1 year'
        }
      });

      toast({
        title: "Sukces",
        description: "Konto użytkownika zostało zablokowane",
      });

      fetchUsers();
    } catch (error: any) {
      console.error("Error banning user:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zablokować użytkownika",
        variant: "destructive",
      });
    }
  };

  const unbanUser = async (userId: string, userEmail: string) => {
    try {
      const { data, error } = await supabase.rpc('unban_user', {
        user_id: userId
      });

      if (error) throw error;

      await logActivity({
        action: 'user_account_unbanned',
        details: {
          description: `Odblokowano konto użytkownika: ${userEmail}`,
          unbanned_user_id: userId
        }
      });

      toast({
        title: "Sukces",
        description: "Konto użytkownika zostało odblokowane",
      });

      fetchUsers();
    } catch (error: any) {
      console.error("Error unbanning user:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się odblokować użytkownika",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nigdy';
    return new Date(dateString).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (adminLoading || !isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Zarządzanie użytkownikami</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Ładowanie użytkowników...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Zarządzanie użytkownikami
        </CardTitle>
        <CardDescription>
          Zarządzaj kontami użytkowników, rolami i uprawnieniami. Tylko administratorzy mogą blokować konta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Imię i nazwisko</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status konta</TableHead>
                <TableHead>Ostatnie logowanie</TableHead>
                <TableHead>Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const roles = getUserRoles(user.id);
                const userName = user.user_metadata?.first_name && user.user_metadata?.last_name
                  ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
                  : 'Brak danych';

                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{userName}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {roles.length > 0 ? (
                          roles.map((role) => (
                            <Badge
                              key={role}
                              variant={role === 'admin' ? 'destructive' : role === 'therapist' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {role === 'admin' ? 'Administrator' : role === 'therapist' ? 'Terapeuta' : 'Użytkownik'}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline" className="text-xs">Użytkownik</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.is_banned ? (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <Ban className="w-3 h-3" />
                            Zablokowane
                          </Badge>
                        ) : user.email_confirmed_at ? (
                          <Badge variant="default" className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Aktywne
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Niepotwerdzone
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(user.last_sign_in_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 flex-wrap">
                        {/* Edit user button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingUser(user);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edytuj
                        </Button>
                        
                        {/* Role management buttons */}
                        {!roles.includes('admin') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addRole(user.id, 'admin')}
                          >
                            <Crown className="w-3 h-3 mr-1" />
                            Admin
                          </Button>
                        )}
                        
                        {!roles.includes('therapist') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addRole(user.id, 'therapist')}
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            Terapeuta
                          </Button>
                        )}
                        
                        {/* Remove roles buttons */}
                        {roles.includes('admin') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeRole(user.id, 'admin')}
                          >
                            <UserX className="w-3 h-3 mr-1" />
                            Usuń Admin
                          </Button>
                        )}
                        
                        {roles.includes('therapist') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeRole(user.id, 'therapist')}
                          >
                            <UserX className="w-3 h-3 mr-1" />
                            Usuń Terapeuta
                          </Button>
                        )}
                         
                         {/* Account ban/unban functionality temporarily disabled 
                             as it requires direct access to auth.users table */}
                         {false && user.is_banned ? (
                           <AlertDialog>
                             <AlertDialogTrigger asChild>
                               <Button
                                 size="sm"
                                 variant="default"
                                 className="bg-green-600 hover:bg-green-700"
                               >
                                 <CheckCircle className="w-3 h-3 mr-1" />
                                 Odblokuj
                               </Button>
                             </AlertDialogTrigger>
                             <AlertDialogContent>
                               <AlertDialogHeader>
                                 <AlertDialogTitle>Odblokuj konto użytkownika</AlertDialogTitle>
                                 <AlertDialogDescription>
                                   Czy na pewno chcesz odblokować konto użytkownika {user.email}? 
                                   Użytkownik będzie mógł ponownie się logować.
                                 </AlertDialogDescription>
                               </AlertDialogHeader>
                               <AlertDialogFooter>
                                 <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                 <AlertDialogAction
                                   onClick={() => unbanUser(user.id, user.email)}
                                   className="bg-green-600 hover:bg-green-700"
                                 >
                                   Odblokuj konto
                                 </AlertDialogAction>
                               </AlertDialogFooter>
                             </AlertDialogContent>
                           </AlertDialog>
                         ) : false && (
                           <AlertDialog>
                             <AlertDialogTrigger asChild>
                               <Button
                                 size="sm"
                                 variant="destructive"
                               >
                                 <Ban className="w-3 h-3 mr-1" />
                                 Zablokuj
                               </Button>
                             </AlertDialogTrigger>
                             <AlertDialogContent>
                               <AlertDialogHeader>
                                 <AlertDialogTitle>Zablokuj konto użytkownika</AlertDialogTitle>
                                 <AlertDialogDescription>
                                   Czy na pewno chcesz zablokować konto użytkownika {user.email}? 
                                   Użytkownik zostanie wylogowany i nie będzie mógł się logować przez rok.
                                   Ta akcja zostanie zapisana w logach bezpieczeństwa.
                                 </AlertDialogDescription>
                               </AlertDialogHeader>
                               <AlertDialogFooter>
                                 <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                 <AlertDialogAction
                                   onClick={() => banUser(user.id, user.email)}
                                   className="bg-red-600 hover:bg-red-700"
                                 >
                                   Zablokuj konto
                                 </AlertDialogAction>
                               </AlertDialogFooter>
                             </AlertDialogContent>
                           </AlertDialog>
                         )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Brak użytkowników
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <EditUserDialog
        user={editingUser}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onUserUpdated={fetchUsers}
      />
    </Card>
  );
};

export default UsersManager;