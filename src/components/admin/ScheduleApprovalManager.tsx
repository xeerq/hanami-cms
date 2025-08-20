import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Check, X, Clock, Calendar, User } from "lucide-react";

interface Schedule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  created_at: string;
  therapists: {
    name: string;
  };
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

export const ScheduleApprovalManager = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const { toast } = useToast();

  useEffect(() => {
    fetchSchedules();
  }, [filter]);

  const fetchSchedules = async () => {
    try {
      let query = supabase
        .from('therapist_schedules')
        .select(`
          *,
          therapists (
            name
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
      setSchedules((data || []) as Schedule[]);
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać grafików",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSchedule = async (scheduleId: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('therapist_schedules')
        .update({
          status: 'approved',
          approved_by: (await supabase.auth.getUser()).data.user?.id!,
          approved_at: new Date().toISOString(),
          notes: notes || null
        })
        .eq('id', scheduleId);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Grafik został zatwierdzony",
      });
      
      fetchSchedules();
      setSelectedSchedule(null);
      setAdminNotes('');
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: "Nie udało się zatwierdzić grafiku",
        variant: "destructive",
      });
    }
  };

  const handleRejectSchedule = async (scheduleId: string, notes: string) => {
    if (!notes.trim()) {
      toast({
        title: "Błąd",
        description: "Podaj powód odrzucenia",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('therapist_schedules')
        .update({
          status: 'rejected',
          approved_by: (await supabase.auth.getUser()).data.user?.id!,
          approved_at: new Date().toISOString(),
          notes: notes
        })
        .eq('id', scheduleId);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Grafik został odrzucony",
      });
      
      fetchSchedules();
      setSelectedSchedule(null);
      setAdminNotes('');
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: "Nie udało się odrzucić grafiku",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { label: 'Oczekuje', variant: 'secondary' as const },
      approved: { label: 'Zatwierdzony', variant: 'default' as const },
      rejected: { label: 'Odrzucony', variant: 'destructive' as const }
    };
    
    const statusInfo = variants[status as keyof typeof variants] || variants.pending;
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getDayLabel = (dayOfWeek: number) => {
    return DAYS_OF_WEEK.find(day => day.value === dayOfWeek)?.label || '';
  };

  const getPendingCount = () => {
    return schedules.filter(s => s.status === 'pending').length;
  };

  const groupSchedulesByTherapist = () => {
    const grouped = schedules.reduce((acc, schedule) => {
      const therapistName = schedule.therapists.name;
      if (!acc[therapistName]) {
        acc[therapistName] = [];
      }
      acc[therapistName].push(schedule);
      return acc;
    }, {} as Record<string, Schedule[]>);
    
    return Object.entries(grouped);
  };

  const getTherapistPendingCount = (therapistSchedules: Schedule[]) => {
    return therapistSchedules.filter(s => s.status === 'pending').length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Zatwierdzanie grafików terapeutów
              {getPendingCount() > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {getPendingCount()} oczekuje
                </Badge>
              )}
            </CardTitle>
            <div className="flex gap-2">
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
          </div>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Brak grafików do wyświetlenia</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupSchedulesByTherapist().map(([therapistName, therapistSchedules]) => (
                <Card key={therapistName} className="border border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {therapistName}
                        {getTherapistPendingCount(therapistSchedules) > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {getTherapistPendingCount(therapistSchedules)} oczekuje
                          </Badge>
                        )}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {therapistSchedules.length} {therapistSchedules.length === 1 ? 'grafik' : 'grafików'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {therapistSchedules.map(schedule => (
                        <div key={schedule.id} className="border rounded-lg p-4 bg-card/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span className="font-medium">{getDayLabel(schedule.day_of_week)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>{schedule.start_time} - {schedule.end_time}</span>
                              </div>
                              {getStatusBadge(schedule.status)}
                            </div>
                            
                            <div className="flex gap-2">
                              {schedule.status === 'pending' && (
                                <>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button size="sm" variant="outline" className="gap-2"
                                        onClick={() => {
                                          setSelectedSchedule(schedule);
                                          setAdminNotes('');
                                        }}>
                                        <Check className="h-4 w-4" />
                                        Zatwierdź
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Zatwierdź grafik</DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div className="p-4 bg-muted rounded-lg">
                                          <p><strong>Terapeuta:</strong> {schedule.therapists.name}</p>
                                          <p><strong>Dzień:</strong> {getDayLabel(schedule.day_of_week)}</p>
                                          <p><strong>Godziny:</strong> {schedule.start_time} - {schedule.end_time}</p>
                                          {schedule.notes && (
                                            <p><strong>Notatki terapeuty:</strong> {schedule.notes}</p>
                                          )}
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium">Notatki administratora (opcjonalne)</label>
                                          <Textarea
                                            value={adminNotes}
                                            onChange={(e) => setAdminNotes(e.target.value)}
                                            placeholder="Dodatkowe uwagi..."
                                            className="mt-2"
                                          />
                                        </div>
                                        <div className="flex gap-2">
                                          <Button onClick={() => handleApproveSchedule(schedule.id, adminNotes)}>
                                            Zatwierdź
                                          </Button>
                                          <Button variant="outline" onClick={() => setSelectedSchedule(null)}>
                                            Anuluj
                                          </Button>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                  
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button size="sm" variant="destructive" className="gap-2"
                                        onClick={() => {
                                          setSelectedSchedule(schedule);
                                          setAdminNotes('');
                                        }}>
                                        <X className="h-4 w-4" />
                                        Odrzuć
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Odrzuć grafik</DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div className="p-4 bg-muted rounded-lg">
                                          <p><strong>Terapeuta:</strong> {schedule.therapists.name}</p>
                                          <p><strong>Dzień:</strong> {getDayLabel(schedule.day_of_week)}</p>
                                          <p><strong>Godziny:</strong> {schedule.start_time} - {schedule.end_time}</p>
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium">Powód odrzucenia *</label>
                                          <Textarea
                                            value={adminNotes}
                                            onChange={(e) => setAdminNotes(e.target.value)}
                                            placeholder="Podaj powód odrzucenia..."
                                            className="mt-2"
                                          />
                                        </div>
                                        <div className="flex gap-2">
                                          <Button 
                                            variant="destructive" 
                                            onClick={() => handleRejectSchedule(schedule.id, adminNotes)}
                                          >
                                            Odrzuć
                                          </Button>
                                          <Button variant="outline" onClick={() => setSelectedSchedule(null)}>
                                            Anuluj
                                          </Button>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {schedule.notes && schedule.status !== 'pending' && (
                            <div className="mt-3 p-3 bg-muted rounded text-sm">
                              <strong>Notatki:</strong> {schedule.notes}
                            </div>
                          )}
                          
                          <div className="mt-2 text-xs text-muted-foreground">
                            Utworzono: {new Date(schedule.created_at).toLocaleString('pl-PL')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};