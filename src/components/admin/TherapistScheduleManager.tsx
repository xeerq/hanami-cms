import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Calendar, Clock, User, CheckCircle, XCircle } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useActivityLogger } from "@/hooks/useActivityLogger";

interface TherapistSchedule {
  id: string;
  therapist_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  created_at: string;
  updated_at: string;
  approved_by?: string;
  approved_at?: string;
  therapists: {
    id: string;
    name: string;
    user_id?: string;
  };
}

interface CreateScheduleForm {
  therapist_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  notes: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Niedziela' },
  { value: 1, label: 'Poniedziałek' },
  { value: 2, label: 'Wtorek' },
  { value: 3, label: 'Środa' },
  { value: 4, label: 'Czwartek' },
  { value: 5, label: 'Piątek' },
  { value: 6, label: 'Sobota' },
];

export const TherapistScheduleManager = () => {
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const { logActivity } = useActivityLogger();
  const [schedules, setSchedules] = useState<TherapistSchedule[]>([]);
  const [therapists, setTherapists] = useState<{id: string, name: string, user_id?: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<TherapistSchedule | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<CreateScheduleForm>({
    therapist_id: '',
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    notes: ''
  });

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      fetchSchedules();
      fetchTherapists();
    }
  }, [isAdmin, adminLoading, filter]);

  const fetchTherapists = async () => {
    try {
      const { data, error } = await supabase
        .from('therapists')
        .select('id, name, user_id')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setTherapists(data || []);
    } catch (error: any) {
      console.error('Error fetching therapists:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać listy terapeutów",
        variant: "destructive",
      });
    }
  };

  const fetchSchedules = async () => {
    try {
      let query = supabase
        .from('therapist_schedules')
        .select(`
          *,
          therapists (
            id,
            name,
            user_id
          )
        `)
        .order('therapist_id', { ascending: true })
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSchedules((data || []) as TherapistSchedule[]);
    } catch (error: any) {
      console.error('Error fetching schedules:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać grafików",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendNotificationToTherapist = async (therapistUserId: string, title: string, message: string, scheduleId: string) => {
    if (!therapistUserId) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: therapistUserId,
          title,
          message,
          type: 'info',
          related_id: scheduleId,
          related_type: 'schedule'
        });

      if (error) {
        console.error('Error sending notification:', error);
      }
    } catch (error) {
      console.error('Error in sendNotificationToTherapist:', error);
    }
  };

  const sendNotificationToAdmins = async (title: string, message: string, scheduleId: string) => {
    try {
      // Get all admin user IDs
      const { data: adminUsers, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (error || !adminUsers) return;

      const notifications = adminUsers.map(admin => ({
        user_id: admin.user_id,
        title,
        message,
        type: 'info' as const,
        related_id: scheduleId,
        related_type: 'schedule' as const
      }));

      await supabase
        .from('notifications')
        .insert(notifications);
    } catch (error) {
      console.error('Error sending admin notifications:', error);
    }
  };

  const handleCreateSchedule = async () => {
    if (!formData.therapist_id || !formData.start_time || !formData.end_time) {
      toast({
        title: "Błąd",
        description: "Wypełnij wszystkie wymagane pola",
        variant: "destructive",
      });
      return;
    }

    try {
      const therapist = therapists.find(t => t.id === formData.therapist_id);
      
      const { data, error } = await supabase
        .from('therapist_schedules')
        .insert({
          therapist_id: formData.therapist_id,
          day_of_week: formData.day_of_week,
          start_time: formData.start_time,
          end_time: formData.end_time,
          notes: formData.notes || null,
          status: 'approved', // Administrator może bezpośrednio zatwierdzać
          approved_by: (await supabase.auth.getUser()).data.user?.id!,
          approved_at: new Date().toISOString(),
          created_by: (await supabase.auth.getUser()).data.user?.id!
        })
        .select()
        .single();

      if (error) throw error;

      // Send notification to therapist
      if (therapist?.user_id) {
        await sendNotificationToTherapist(
          therapist.user_id,
          'Nowy grafik został dodany',
          `Administrator dodał Ci nowy grafik na ${DAYS_OF_WEEK.find(d => d.value === formData.day_of_week)?.label} (${formData.start_time} - ${formData.end_time})`,
          data.id
        );
      }

      // Log activity
      await logActivity({
        action: 'admin_schedule_created',
        details: {
          description: `Administrator dodał nowy grafik dla ${therapist?.name}`,
          therapist_id: formData.therapist_id,
          day_of_week: formData.day_of_week,
          time_range: `${formData.start_time} - ${formData.end_time}`
        }
      });

      toast({
        title: "Sukces",
        description: "Grafik został dodany i zatwierdzoby",
      });

      setShowCreateDialog(false);
      setFormData({
        therapist_id: '',
        day_of_week: 1,
        start_time: '09:00',
        end_time: '17:00',
        notes: ''
      });
      fetchSchedules();
    } catch (error: any) {
      console.error('Error creating schedule:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się dodać grafiku",
        variant: "destructive",
      });
    }
  };

  const handleEditSchedule = async () => {
    if (!selectedSchedule) return;

    try {
      const { error } = await supabase
        .from('therapist_schedules')
        .update({
          day_of_week: formData.day_of_week,
          start_time: formData.start_time,
          end_time: formData.end_time,
          notes: formData.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedSchedule.id);

      if (error) throw error;

      // Send notification to therapist
      if (selectedSchedule.therapists.user_id) {
        await sendNotificationToTherapist(
          selectedSchedule.therapists.user_id,
          'Grafik został zaktualizowany',
          `Administrator zaktualizował Twój grafik na ${DAYS_OF_WEEK.find(d => d.value === formData.day_of_week)?.label} (${formData.start_time} - ${formData.end_time})`,
          selectedSchedule.id
        );
      }

      // Log activity
      await logActivity({
        action: 'admin_schedule_updated',
        details: {
          description: `Administrator zaktualizował grafik dla ${selectedSchedule.therapists.name}`,
          schedule_id: selectedSchedule.id,
          changes: {
            day_of_week: formData.day_of_week,
            time_range: `${formData.start_time} - ${formData.end_time}`
          }
        }
      });

      toast({
        title: "Sukces",
        description: "Grafik został zaktualizowany",
      });

      setShowEditDialog(false);
      setSelectedSchedule(null);
      fetchSchedules();
    } catch (error: any) {
      console.error('Error updating schedule:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować grafiku",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSchedule = async (schedule: TherapistSchedule) => {
    if (!window.confirm(`Czy na pewno chcesz usunąć grafik ${schedule.therapists.name} na ${DAYS_OF_WEEK.find(d => d.value === schedule.day_of_week)?.label}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('therapist_schedules')
        .delete()
        .eq('id', schedule.id);

      if (error) throw error;

      // Send notification to therapist
      if (schedule.therapists.user_id) {
        await sendNotificationToTherapist(
          schedule.therapists.user_id,
          'Grafik został usunięty',
          `Administrator usunął Twój grafik na ${DAYS_OF_WEEK.find(d => d.value === schedule.day_of_week)?.label} (${schedule.start_time} - ${schedule.end_time})`,
          schedule.id
        );
      }

      // Log activity
      await logActivity({
        action: 'admin_schedule_deleted',
        details: {
          description: `Administrator usunął grafik dla ${schedule.therapists.name}`,
          deleted_schedule: {
            day_of_week: schedule.day_of_week,
            time_range: `${schedule.start_time} - ${schedule.end_time}`
          }
        }
      });

      toast({
        title: "Sukces",
        description: "Grafik został usunięty",
      });

      fetchSchedules();
    } catch (error: any) {
      console.error('Error deleting schedule:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć grafiku",
        variant: "destructive",
      });
    }
  };

  const handleApproveSchedule = async (schedule: TherapistSchedule) => {
    try {
      const { error } = await supabase
        .from('therapist_schedules')
        .update({
          status: 'approved',
          approved_by: (await supabase.auth.getUser()).data.user?.id!,
          approved_at: new Date().toISOString()
        })
        .eq('id', schedule.id);

      if (error) throw error;

      // Send notification to therapist
      if (schedule.therapists.user_id) {
        await sendNotificationToTherapist(
          schedule.therapists.user_id,
          'Grafik został zatwierdzony',
          `Twój grafik na ${DAYS_OF_WEEK.find(d => d.value === schedule.day_of_week)?.label} (${schedule.start_time} - ${schedule.end_time}) został zatwierdzony przez administratora`,
          schedule.id
        );
      }

      // Log activity
      await logActivity({
        action: 'schedule_approved_by_admin',
        details: {
          description: `Administrator zatwierdził grafik dla ${schedule.therapists.name}`,
          schedule_id: schedule.id
        }
      });

      toast({
        title: "Sukces",
        description: "Grafik został zatwierdzony",
      });

      fetchSchedules();
    } catch (error: any) {
      console.error('Error approving schedule:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zatwierdzić grafiku",
        variant: "destructive",
      });
    }
  };

  const handleRejectSchedule = async (schedule: TherapistSchedule) => {
    const reason = window.prompt('Podaj powód odrzucenia grafiku:');
    if (reason === null) return; // User cancelled

    try {
      const { error } = await supabase
        .from('therapist_schedules')
        .update({
          status: 'rejected',
          notes: reason
        })
        .eq('id', schedule.id);

      if (error) throw error;

      // Send notification to therapist
      if (schedule.therapists.user_id) {
        await sendNotificationToTherapist(
          schedule.therapists.user_id,
          'Grafik został odrzucony',
          `Twój grafik na ${DAYS_OF_WEEK.find(d => d.value === schedule.day_of_week)?.label} (${schedule.start_time} - ${schedule.end_time}) został odrzucony. Powód: ${reason}`,
          schedule.id
        );
      }

      // Log activity
      await logActivity({
        action: 'schedule_rejected_by_admin',
        details: {
          description: `Administrator odrzucił grafik dla ${schedule.therapists.name}`,
          schedule_id: schedule.id,
          reason
        }
      });

      toast({
        title: "Sukces",
        description: "Grafik został odrzucony",
      });

      fetchSchedules();
    } catch (error: any) {
      console.error('Error rejecting schedule:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się odrzucić grafiku",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="w-3 h-3" />Oczekuje</Badge>;
      case 'approved':
        return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />Zatwierdzony</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="w-3 h-3" />Odrzucony</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDayLabel = (dayOfWeek: number) => {
    return DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label || 'Nieznany';
  };

  if (adminLoading || !isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Zarządzanie grafikami terapeutów</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Ładowanie grafików...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Zarządzanie grafikami terapeutów
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Dodawaj, edytuj i zarządzaj grafikami pracy terapeutów. Wszystkie zmiany będą automatycznie przekazane zainteresowanym osobom.
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Dodaj grafik
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-6">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
              <Button
                key={status}
                variant={filter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(status)}
              >
                {status === 'all' ? 'Wszystkie' : 
                 status === 'pending' ? 'Oczekujące' :
                 status === 'approved' ? 'Zatwierdzone' : 'Odrzucone'}
              </Button>
            ))}
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Terapeuta</TableHead>
                  <TableHead>Dzień tygodnia</TableHead>
                  <TableHead>Godziny</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notatki</TableHead>
                  <TableHead>Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {schedule.therapists.name}
                      </div>
                    </TableCell>
                    <TableCell>{getDayLabel(schedule.day_of_week)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {schedule.start_time} - {schedule.end_time}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                    <TableCell className="max-w-xs truncate">{schedule.notes || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSchedule(schedule);
                            setFormData({
                              therapist_id: schedule.therapist_id,
                              day_of_week: schedule.day_of_week,
                              start_time: schedule.start_time,
                              end_time: schedule.end_time,
                              notes: schedule.notes || ''
                            });
                            setShowEditDialog(true);
                          }}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        
                        {schedule.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApproveSchedule(schedule)}
                            >
                              <CheckCircle className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectSchedule(schedule)}
                            >
                              <XCircle className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                        
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteSchedule(schedule)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {schedules.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Brak grafików do wyświetlenia
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj nowy grafik</DialogTitle>
            <DialogDescription>
              Dodaj nowy grafik dla terapeuty. Zostanie automatycznie zatwierdzony i terapeuta otrzyma powiadomienie.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="therapist">Terapeuta</Label>
              <Select value={formData.therapist_id} onValueChange={(value) => setFormData({...formData, therapist_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz terapeutę" />
                </SelectTrigger>
                <SelectContent>
                  {therapists.map((therapist) => (
                    <SelectItem key={therapist.id} value={therapist.id}>
                      {therapist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="day">Dzień tygodnia</Label>
              <Select value={formData.day_of_week.toString()} onValueChange={(value) => setFormData({...formData, day_of_week: parseInt(value)})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time">Godzina rozpoczęcia</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="end_time">Godzina zakończenia</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notatki (opcjonalne)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Dodatkowe informacje o grafiku..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Anuluj
            </Button>
            <Button onClick={handleCreateSchedule}>
              Dodaj grafik
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj grafik</DialogTitle>
            <DialogDescription>
              Edytuj istniejący grafik. Terapeuta otrzyma powiadomienie o zmianie.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Terapeuta</Label>
              <Input 
                value={selectedSchedule?.therapists.name || ''} 
                disabled 
                className="bg-muted"
              />
            </div>

            <div>
              <Label htmlFor="edit_day">Dzień tygodnia</Label>
              <Select value={formData.day_of_week.toString()} onValueChange={(value) => setFormData({...formData, day_of_week: parseInt(value)})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_start_time">Godzina rozpoczęcia</Label>
                <Input
                  id="edit_start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit_end_time">Godzina zakończenia</Label>
                <Input
                  id="edit_end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit_notes">Notatki (opcjonalne)</Label>
              <Textarea
                id="edit_notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Dodatkowe informacje o grafiku..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Anuluj
            </Button>
            <Button onClick={handleEditSchedule}>
              Zapisz zmiany
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};