import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit, Trash2, Stethoscope, RefreshCw } from "lucide-react";
import { usePagination, usePaginatedData } from "@/hooks/usePagination";
import { PaginationControlsComponent } from "@/components/ui/pagination-controls";
import CreateTherapistDialog from "@/components/admin/CreateTherapistDialog";
import EditTherapistDialog from "@/components/admin/EditTherapistDialog";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useActivityLogger } from "@/hooks/useActivityLogger";

interface UnifiedTeamMember {
  id: string;
  name: string;
  type: 'therapist' | 'team_member';
  position?: string;
  specialization?: string;
  experience?: string;
  bio?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

interface Therapist {
  id: string;
  name: string;
  specialization?: string;
  experience?: string;
  bio?: string;
  avatar_url?: string;
  is_active: boolean;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export function UnifiedTeamDisplay() {
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [teamMembers, setTeamMembers] = useState<UnifiedTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null);
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();

  // Pagination
  const pagination = usePagination(teamMembers.length, 10);
  const paginatedTeamMembers = usePaginatedData(teamMembers, pagination);

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      fetchTeamMembers();
    }
  }, [isAdmin, adminLoading]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);

      // Fetch therapists
      const { data: therapists, error: therapistsError } = await supabase
        .from("therapists")
        .select("*")
        .order("name");

      if (therapistsError) throw therapistsError;

      // Fetch team members
      const { data: teamData, error: teamError } = await supabase
        .rpc('get_team_members_safe', { include_contacts: true });

      if (teamError) throw teamError;

      // Combine and format data
      const unifiedMembers: UnifiedTeamMember[] = [
        ...(therapists || []).map(therapist => ({
          id: therapist.id,
          name: therapist.name,
          type: 'therapist' as const,
          specialization: therapist.specialization,
          experience: therapist.experience,
          bio: therapist.bio,
          avatar_url: therapist.avatar_url,
          is_active: therapist.is_active,
          user_id: therapist.user_id,
          created_at: therapist.created_at,
          updated_at: therapist.updated_at,
        })),
        ...(teamData || []).map(member => ({
          id: member.id,
          name: member.name,
          type: 'team_member' as const,
          position: member.position_name,
          bio: member.bio,
          email: member.email,
          phone: member.phone,
          avatar_url: member.image_url,
          is_active: member.is_active,
          created_at: member.created_at,
          updated_at: member.updated_at,
        }))
      ];

      setTeamMembers(unifiedMembers.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error: any) {
      console.error("Error fetching team members:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować zespołu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditTherapist = (member: UnifiedTeamMember) => {
    if (member.type === 'therapist') {
      const therapist: Therapist = {
        id: member.id,
        name: member.name,
        specialization: member.specialization,
        experience: member.experience,
        bio: member.bio,
        avatar_url: member.avatar_url,
        is_active: member.is_active,
        user_id: member.user_id,
        created_at: member.created_at,
        updated_at: member.updated_at,
      };
      setSelectedTherapist(therapist);
      setShowEditDialog(true);
    }
  };

  const toggleMemberStatus = async (memberId: string, isActive: boolean, type: 'therapist' | 'team_member') => {
    try {
      const tableName = type === 'therapist' ? 'therapists' : 'team_members';
      const { error } = await supabase
        .from(tableName)
        .update({ is_active: !isActive })
        .eq('id', memberId);

      if (error) throw error;

      logActivity({
        action: `${type === 'therapist' ? 'therapist' : 'team_member'}_status_changed`,
        details: {
          description: `Zmieniono status ${type === 'therapist' ? 'terapeuty' : 'członka zespołu'} na ${!isActive ? 'aktywny' : 'nieaktywny'}`
        }
      });

      toast({
        title: "Sukces",
        description: `Status został zmieniony`,
      });

      fetchTeamMembers();
    } catch (error: any) {
      console.error("Error toggling member status:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zmienić statusu",
        variant: "destructive",
      });
    }
  };

  const deleteMember = async (member: UnifiedTeamMember) => {
    if (!confirm(`Czy na pewno chcesz usunąć ${member.name} z zespołu?`)) {
      return;
    }

    try {
      const tableName = member.type === 'therapist' ? 'therapists' : 'team_members';
      
      // Delete avatar if exists
      if (member.avatar_url && member.type === 'therapist') {
        const fileName = member.avatar_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('therapist-avatars')
            .remove([fileName]);
        }
      }

      // Delete user role if therapist has user_id
      if (member.type === 'therapist' && member.user_id) {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', member.user_id)
          .eq('role', 'therapist');
      }

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', member.id);

      if (error) throw error;

      logActivity({
        action: `${member.type}_deleted`,
        details: {
          description: `Usunięto ${member.type === 'therapist' ? 'terapeutę' : 'członka zespołu'}: ${member.name}`
        }
      });

      toast({
        title: "Sukces",
        description: "Członek zespołu został usunięty",
      });

      fetchTeamMembers();
    } catch (error: any) {
      console.error("Error deleting member:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć członka zespołu",
        variant: "destructive",
      });
    }
  };

  const getAvatarFallback = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (adminLoading || !isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Ładowanie zespołu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Zespół</CardTitle>
          <CardDescription>
            Zarządzaj wszystkimi członkami zespołu - terapeutami i innymi pracownikami
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-2">
              <Button onClick={() => setShowCreateDialog(true)}>
                <Stethoscope className="w-4 h-4 mr-2" />
                Dodaj terapeutę
              </Button>
              <Button variant="outline" onClick={fetchTeamMembers}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Odśwież
              </Button>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">
                {teamMembers.filter(m => m.type === 'therapist' && m.is_active).length} terapeutów
              </Badge>
              <Badge variant="outline">
                {teamMembers.filter(m => m.type === 'team_member' && m.is_active).length} członków zespołu
              </Badge>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Członek zespołu</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Specjalizacja/Stanowisko</TableHead>
                  <TableHead>Doświadczenie</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTeamMembers.map((member) => (
                  <TableRow key={`${member.type}-${member.id}`}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage 
                            src={member.avatar_url || undefined} 
                            alt={member.name}
                          />
                          <AvatarFallback className="text-xs">
                            {getAvatarFallback(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          {member.email && (
                            <div className="text-sm text-muted-foreground">{member.email}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.type === 'therapist' ? 'default' : 'secondary'}>
                        {member.type === 'therapist' ? 'Terapeuta' : 'Zespół'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {member.specialization || member.position || '-'}
                    </TableCell>
                    <TableCell>{member.experience || '-'}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleMemberStatus(member.id, member.is_active, member.type)}
                      >
                        <Badge variant={member.is_active ? "default" : "secondary"}>
                          {member.is_active ? 'Aktywny' : 'Nieaktywny'}
                        </Badge>
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {member.type === 'therapist' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditTherapist(member)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteMember(member)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {teamMembers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Brak członków zespołu
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {teamMembers.length > 0 && (
            <div className="mt-4">
              <PaginationControlsComponent
                pagination={pagination}
                totalItems={teamMembers.length}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <CreateTherapistDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          fetchTeamMembers();
          setShowCreateDialog(false);
        }}
      />

      {selectedTherapist && (
        <EditTherapistDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          therapist={selectedTherapist}
          onSuccess={() => {
            fetchTeamMembers();
            setShowEditDialog(false);
            setSelectedTherapist(null);
          }}
        />
      )}
    </div>
  );
}