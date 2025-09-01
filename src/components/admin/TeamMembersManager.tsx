import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Upload, Download, RefreshCw } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";

interface TeamMember {
  id: string;
  name: string;
  position: string;
  bio: string | null;
  email: string | null;
  phone: string | null;
  image_url: string | null;
  social_links: any;
  display_order: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TeamMemberForm {
  name: string;
  position: string;
  bio: string;
  email: string;
  phone: string;
  image_url: string;
  is_active: boolean;
}

export function TeamMembersManager() {
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [formData, setFormData] = useState<TeamMemberForm>({
    name: '',
    position: '',
    bio: '',
    email: '',
    phone: '',
    image_url: '',
    is_active: true
  });
  const { toast } = useToast();

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      loadTeamMembers();
    }
  }, [isAdmin, adminLoading]);

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      
      // Użyj nowej funkcji do bezpiecznego pobierania danych z kontaktami dla adminów
      const { data, error } = await supabase
        .rpc('get_team_members_safe', { include_contacts: true });

      if (error) throw error;
      
      // Przekształć dane z position_name na position dla kompatybilności
      const transformedData = data?.map((member: any) => ({
        ...member,
        position: member.position_name
      })) || [];
      
      setTeamMembers(transformedData);
    } catch (error: any) {
      console.error('Error loading team members:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować członków zespołu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      position: '',
      bio: '',
      email: '',
      phone: '',
      image_url: '',
      is_active: true
    });
    setSelectedMember(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const handleEdit = (member: TeamMember) => {
    setSelectedMember(member);
    setFormData({
      name: member.name,
      position: member.position,
      bio: member.bio || '',
      email: member.email || '',
      phone: member.phone || '',
      image_url: member.image_url || '',
      is_active: member.is_active
    });
    setShowEditDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.position.trim()) {
      toast({
        title: "Błąd",
        description: "Nazwa i stanowisko są wymagane",
        variant: "destructive",
      });
      return;
    }

    try {
      if (selectedMember) {
        // Aktualizacja
        const { error } = await supabase
          .from('team_members')
          .update({
            name: formData.name.trim(),
            position: formData.position.trim(),
            bio: formData.bio.trim() || null,
            email: formData.email.trim() || null,
            phone: formData.phone.trim() || null,
            image_url: formData.image_url.trim() || null,
            is_active: formData.is_active
          })
          .eq('id', selectedMember.id);

        if (error) throw error;
        
        toast({
          title: "Sukces",
          description: "Członek zespołu został zaktualizowany",
        });
        setShowEditDialog(false);
      } else {
        // Tworzenie
        const { error } = await supabase
          .from('team_members')
          .insert({
            name: formData.name.trim(),
            position: formData.position.trim(),
            bio: formData.bio.trim() || null,
            email: formData.email.trim() || null,
            phone: formData.phone.trim() || null,
            image_url: formData.image_url.trim() || null,
            is_active: formData.is_active
          });

        if (error) throw error;
        
        toast({
          title: "Sukces",
          description: "Nowy członek zespołu został dodany",
        });
        setShowCreateDialog(false);
      }

      resetForm();
      loadTeamMembers();
    } catch (error: any) {
      console.error('Error saving team member:', error);
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zapisać członka zespołu",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (member: TeamMember) => {
    if (!confirm(`Czy na pewno chcesz usunąć ${member.name} z zespołu?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', member.id);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Członek zespołu został usunięty",
      });

      loadTeamMembers();
    } catch (error: any) {
      console.error('Error deleting team member:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć członka zespołu",
        variant: "destructive",
      });
    }
  };

  const exportData = () => {
    const csvHeaders = ['Nazwa', 'Stanowisko', 'Bio', 'Email', 'Telefon', 'Status', 'Kolejność'];
    const csvData = teamMembers.map(member => [
      member.name,
      member.position,
      member.bio || '',
      member.email || '',
      member.phone || '',
      member.is_active ? 'Aktywny' : 'Nieaktywny',
      member.display_order || ''
    ]);

    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `zespol_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Sukces",
      description: "Dane zespołu zostały wyeksportowane",
    });
  };

  if (adminLoading || !isAdmin) {
    return null;
  }

  const formDialog = (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>
          {selectedMember ? 'Edytuj członka zespołu' : 'Dodaj członka zespołu'}
        </DialogTitle>
        <DialogDescription>
          Uzupełnij informacje o członku zespołu. Tylko administratorzy mają dostęp do danych kontaktowych.
        </DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Imię i nazwisko *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Jan Kowalski"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="position">Stanowisko *</Label>
            <Input
              id="position"
              value={formData.position}
              onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
              placeholder="Masażysta"
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="bio">Biografia</Label>
          <Textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
            placeholder="Krótka biografia..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="jan@example.com"
            />
          </div>
          
          <div>
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+48 123 456 789"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="image_url">URL zdjęcia</Label>
          <Input
            id="image_url"
            value={formData.image_url}
            onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
            placeholder="https://example.com/photo.jpg"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
          />
          <Label htmlFor="is_active">Aktywny</Label>
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => {
              setShowCreateDialog(false);
              setShowEditDialog(false);
              resetForm();
            }}
          >
            Anuluj
          </Button>
          <Button type="submit">
            {selectedMember ? 'Zaktualizuj' : 'Dodaj'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Zarządzanie zespołem</CardTitle>
          <CardDescription>
            Zarządzaj członkami zespołu i ich informacjami kontaktowymi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-2">
              <Button onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Dodaj członka
              </Button>
              <Button variant="outline" onClick={loadTeamMembers}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Odśwież
              </Button>
              <Button variant="outline" onClick={exportData}>
                <Download className="w-4 h-4 mr-2" />
                Eksportuj CSV
              </Button>
            </div>
            <Badge variant="secondary">
              {teamMembers.length} członków
            </Badge>
          </div>

          {loading ? (
            <div className="text-center py-8">Ładowanie...</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nazwa</TableHead>
                    <TableHead>Stanowisko</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Kolejność</TableHead>
                    <TableHead>Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>{member.position}</TableCell>
                      <TableCell>{member.email || '-'}</TableCell>
                      <TableCell>{member.phone || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={member.is_active ? "default" : "secondary"}>
                          {member.is_active ? 'Aktywny' : 'Nieaktywny'}
                        </Badge>
                      </TableCell>
                      <TableCell>{member.display_order || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(member)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(member)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {teamMembers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Brak członków zespołu
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        {formDialog}
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        {formDialog}
      </Dialog>
    </div>
  );
}