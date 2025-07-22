import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCog, Plus, Edit, Trash2, Shield, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UserWithRole {
  user_id: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  roles: string[];
}

const UsersManager = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // First get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, phone");

      if (profilesError) throw profilesError;

      // Then get all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Combine the data
      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
        const roles = (userRoles || [])
          .filter(role => role.user_id === profile.user_id)
          .map(role => role.role);

        return {
          ...profile,
          roles: roles.length > 0 ? roles : ['user']
        };
      });

      setUsers(usersWithRoles);
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

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      // Remove existing roles
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      // Add new role if not 'user' (default)
      if (newRole !== 'user') {
        const { error } = await supabase
          .from("user_roles")
          .insert({
            user_id: userId,
            role: newRole as "admin" | "therapist" | "user"
          });

        if (error) throw error;
      }

      toast({
        title: "Sukces",
        description: "Rola użytkownika została zaktualizowana",
      });

      fetchUsers();
    } catch (error: any) {
      console.error("Error updating user role:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować roli użytkownika",
        variant: "destructive",
      });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-100 text-red-800";
      case "therapist": return "bg-blue-100 text-blue-800";
      case "user": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case "admin": return "Administrator";
      case "therapist": return "Terapeuta";
      case "user": return "Użytkownik";
      default: return role;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Zarządzanie użytkownikami</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hanami-primary mx-auto"></div>
            <p className="mt-2 text-hanami-neutral">Ładowanie użytkowników...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-hanami-primary">Zarządzanie użytkownikami</CardTitle>
            <CardDescription>
              Zarządzaj rolami i uprawnieniami użytkowników
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.length === 0 ? (
            <div className="text-center py-8 text-hanami-neutral">
              Brak użytkowników do wyświetlenia
            </div>
          ) : (
            users.map((user) => (
              <div key={user.user_id} className="border border-hanami-accent/20 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-hanami-secondary rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-hanami-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-hanami-primary">
                        {user.first_name} {user.last_name}
                      </h3>
                      {user.phone && (
                        <p className="text-sm text-hanami-neutral">
                          Telefon: {user.phone}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 mt-2">
                        {user.roles.map((role) => (
                          <Badge key={role} className={getRoleColor(role)}>
                            {getRoleText(role)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Select
                      value={user.roles[0] || 'user'}
                      onValueChange={(value) => updateUserRole(user.user_id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Użytkownik</SelectItem>
                        <SelectItem value="therapist">Terapeuta</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UsersManager;