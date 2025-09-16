import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Edit, Trash2, Star, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VoucherTemplate {
  id: string;
  name: string;
  description: string;
  design_config: any;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const TemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<VoucherTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('voucher_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Błąd podczas ładowania szablonów');
    } finally {
      setLoading(false);
    }
  };

  const toggleDefault = async (templateId: string) => {
    try {
      // First, remove default from all templates
      await supabase
        .from('voucher_templates')
        .update({ is_default: false })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

      // Then set the selected template as default
      const { error } = await supabase
        .from('voucher_templates')
        .update({ is_default: true })
        .eq('id', templateId);

      if (error) throw error;

      toast.success('Szablon domyślny został zmieniony');
      loadTemplates();
    } catch (error) {
      console.error('Error updating default template:', error);
      toast.error('Błąd podczas zmiany szablonu domyślnego');
    }
  };

  const toggleActive = async (templateId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('voucher_templates')
        .update({ is_active: !isActive })
        .eq('id', templateId);

      if (error) throw error;

      toast.success(isActive ? 'Szablon został dezaktywowany' : 'Szablon został aktywowany');
      loadTemplates();
    } catch (error) {
      console.error('Error updating template status:', error);
      toast.error('Błąd podczas aktualizacji statusu szablonu');
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('voucher_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast.success('Szablon został usunięty');
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Błąd podczas usuwania szablonu');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Zarządzanie Szablonami</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p>Ładowanie szablonów...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zarządzanie Szablonami</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nazwa</TableHead>
              <TableHead>Opis</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Utworzono</TableHead>
              <TableHead className="w-[200px]">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="font-medium">
                  {template.name}
                  {template.is_default && (
                    <Badge variant="secondary" className="ml-2">
                      Domyślny
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{template.description || '-'}</TableCell>
                <TableCell>
                  <Badge variant={template.is_active ? 'default' : 'secondary'}>
                    {template.is_active ? 'Aktywny' : 'Nieaktywny'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(template.created_at).toLocaleDateString('pl-PL')}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleDefault(template.id)}
                      disabled={template.is_default}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(template.id, template.is_active)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          disabled={template.is_default}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Usuń szablon</AlertDialogTitle>
                          <AlertDialogDescription>
                            Czy na pewno chcesz usunąć szablon "{template.name}"? 
                            Tej operacji nie można cofnąć.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anuluj</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteTemplate(template.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Usuń
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {templates.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Brak szablonów do wyświetlenia
          </div>
        )}
      </CardContent>
    </Card>
  );
};