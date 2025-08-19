import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Clock, Calendar, Trash2 } from "lucide-react";

interface TherapistScheduleManagerProps {
  therapistId: string;
}

interface Schedule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  created_at: string;
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

export const TherapistScheduleManager = ({ therapistId }: TherapistScheduleManagerProps) => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    day_of_week: '',
    start_time: '',
    end_time: '',
    notes: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchSchedules();
  }, [therapistId]);

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('therapist_schedules')
        .select('*')
        .eq('therapist_id', therapistId)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setSchedules((data || []) as Schedule[]);
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać grafiku",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!newSchedule.day_of_week || !newSchedule.start_time || !newSchedule.end_time) {
      toast({
        title: "Błąd",
        description: "Wszystkie pola są wymagane",
        variant: "destructive",
      });
      return;
    }

    if (newSchedule.start_time >= newSchedule.end_time) {
      toast({
        title: "Błąd",
        description: "Godzina rozpoczęcia musi być wcześniejsza niż zakończenia",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('therapist_schedules')
        .insert({
          therapist_id: therapistId,
          day_of_week: parseInt(newSchedule.day_of_week),
          start_time: newSchedule.start_time,
          end_time: newSchedule.end_time,
          notes: newSchedule.notes,
          created_by: (await supabase.auth.getUser()).data.user?.id!,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Nowy termin został dodany i oczekuje na zatwierdzenie",
      });

      setShowAddForm(false);
      setNewSchedule({ day_of_week: '', start_time: '', end_time: '', notes: '' });
      fetchSchedules();
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: "Nie udało się dodać terminu",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('therapist_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Termin został usunięty",
      });
      fetchSchedules();
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć terminu",
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
              Mój grafik dostępności
            </CardTitle>
            <Button onClick={() => setShowAddForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Dodaj termin
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nie masz jeszcze żadnych terminów w grafiku</p>
              <p className="text-sm">Dodaj swoje godziny dostępności</p>
            </div>
          ) : (
            <div className="space-y-4">
              {DAYS_OF_WEEK.map(day => {
                const daySchedules = schedules.filter(s => s.day_of_week === day.value);
                
                return (
                  <div key={day.value} className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">{day.label}</h3>
                    {daySchedules.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Brak terminów</p>
                    ) : (
                      <div className="space-y-2">
                        {daySchedules.map(schedule => (
                          <div key={schedule.id} className="flex items-center justify-between bg-muted p-3 rounded">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span className="font-medium">
                                  {schedule.start_time} - {schedule.end_time}
                                </span>
                              </div>
                              {getStatusBadge(schedule.status)}
                              {schedule.notes && (
                                <span className="text-sm text-muted-foreground">
                                  • {schedule.notes}
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSchedule(schedule.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Dodaj nowy termin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="day">Dzień tygodnia</Label>
                <Select value={newSchedule.day_of_week} onValueChange={(value) => 
                  setNewSchedule({ ...newSchedule, day_of_week: value })
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz dzień" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map(day => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="start_time">Godzina rozpoczęcia</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={newSchedule.start_time}
                  onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="end_time">Godzina zakończenia</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={newSchedule.end_time}
                  onChange={(e) => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="notes">Notatki (opcjonalne)</Label>
              <Textarea
                id="notes"
                placeholder="Dodatkowe informacje..."
                value={newSchedule.notes}
                onChange={(e) => setNewSchedule({ ...newSchedule, notes: e.target.value })}
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleAddSchedule}>Dodaj termin</Button>
              <Button variant="outline" onClick={() => {
                setShowAddForm(false);
                setNewSchedule({ day_of_week: '', start_time: '', end_time: '', notes: '' });
              }}>
                Anuluj
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};