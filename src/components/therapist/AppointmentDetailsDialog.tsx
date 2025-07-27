import React from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Calendar, Clock, User, Phone, FileText, Activity, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  user_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  is_guest: boolean;
  status: string;
  notes?: string;
  services?: {
    name: string;
    duration: number;
    price: number;
    description?: string;
  };
  profiles?: {
    first_name: string;
    last_name: string;
    phone?: string;
  };
}

interface AppointmentDetailsDialogProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (appointmentId: string, newStatus: string) => void;
}

const AppointmentDetailsDialog = ({
  appointment,
  open,
  onOpenChange,
  onStatusChange,
}: AppointmentDetailsDialogProps) => {
  if (!appointment) return null;

  const getClientName = () => {
    if (appointment.is_guest) {
      return appointment.guest_name || "Gość";
    }
    return appointment.profiles 
      ? `${appointment.profiles.first_name} ${appointment.profiles.last_name}`
      : "Nieznany klient";
  };

  const getClientPhone = () => {
    if (appointment.is_guest) {
      return appointment.guest_phone;
    }
    return appointment.profiles?.phone;
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'confirmed':
        return {
          label: 'Potwierdzona',
          icon: CheckCircle,
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          gradient: 'from-emerald-500 to-green-600'
        };
      case 'cancelled':
        return {
          label: 'Anulowana',
          icon: XCircle,
          color: 'bg-red-100 text-red-800 border-red-200',
          gradient: 'from-red-500 to-rose-600'
        };
      case 'pending':
        return {
          label: 'Oczekująca',
          icon: AlertCircle,
          color: 'bg-amber-100 text-amber-800 border-amber-200',
          gradient: 'from-amber-400 to-yellow-500'
        };
      default:
        return {
          label: status,
          icon: Activity,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          gradient: 'from-gray-400 to-gray-500'
        };
    }
  };

  const calculateEndTime = () => {
    const [hours, minutes] = appointment.appointment_time.split(':').map(Number);
    const duration = appointment.services?.duration || 30;
    const endTimeMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(endTimeMinutes / 60);
    const endMins = endTimeMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  };

  const statusInfo = getStatusInfo(appointment.status);
  const StatusIcon = statusInfo.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-light bg-gradient-to-r from-hanami-primary to-hanami-accent bg-clip-text text-transparent">
            Szczegóły wizyty
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status */}
          <Card className="border-l-4 border-l-hanami-primary">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <StatusIcon className="h-5 w-5 text-gray-600" />
                  <span className="font-medium text-gray-700">Status:</span>
                </div>
                <Badge className={`${statusInfo.color} border`}>
                  {statusInfo.label}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Usługa */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-hanami-primary" />
                  <h3 className="font-semibold text-lg text-gray-800">
                    {appointment.services?.name || "Nieznana usługa"}
                  </h3>
                </div>
                {appointment.services?.description && (
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {appointment.services.description}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Czas trwania: <span className="font-medium">{appointment.services?.duration || 30} min</span>
                    </span>
                  </div>
                  {appointment.services?.price && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        Cena: <span className="font-medium text-hanami-primary">{appointment.services.price} zł</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data i czas */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-hanami-primary" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Data</p>
                    <p className="text-lg text-gray-900">
                      {format(new Date(appointment.appointment_date), "EEEE, d MMMM yyyy", { locale: pl })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-hanami-primary" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Godzina</p>
                    <p className="text-lg text-gray-900">
                      {appointment.appointment_time.slice(0, 5)} - {calculateEndTime()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Klient */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-hanami-primary" />
                  <h3 className="font-semibold text-lg text-gray-800">Klient</h3>
                  {appointment.is_guest && (
                    <Badge variant="outline" className="ml-2">Gość</Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Imię i nazwisko</p>
                    <p className="text-lg text-gray-900">{getClientName()}</p>
                  </div>
                  {getClientPhone() && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Telefon</p>
                        <p className="text-lg text-gray-900">{getClientPhone()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notatki */}
          {appointment.notes && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start space-x-2">
                  <FileText className="h-5 w-5 text-hanami-primary mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-800 mb-2">Notatki</h3>
                    <p className="text-gray-600 leading-relaxed">{appointment.notes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Przyciski akcji */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-gray-800">Zmień status wizyty</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {appointment.status !== 'confirmed' && (
                <Button
                  onClick={() => onStatusChange(appointment.id, 'confirmed')}
                  className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Potwierdź
                </Button>
              )}
              
              {appointment.status !== 'pending' && (
                <Button
                  onClick={() => onStatusChange(appointment.id, 'pending')}
                  variant="outline"
                  className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400 transition-all duration-300"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Oznacz jako oczekującą
                </Button>
              )}
              
              {appointment.status !== 'cancelled' && (
                <Button
                  onClick={() => onStatusChange(appointment.id, 'cancelled')}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 transition-all duration-300"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Anuluj
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentDetailsDialog;