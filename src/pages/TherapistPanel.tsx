import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, Users, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useTherapistCheck } from "@/hooks/useTherapistCheck";
import TherapistCalendar from "@/components/therapist/TherapistCalendar";
import TherapistAppointments from "@/components/therapist/TherapistAppointments";
import { VouchersManager } from "@/components/admin/VouchersManager";

const TherapistPanel = () => {
  const { isTherapist, therapistInfo, loading } = useTherapistCheck();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isTherapist) {
      navigate("/");
    }
  }, [isTherapist, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-hanami-primary"></div>
          <p className="mt-4 text-hanami-neutral">Sprawdzanie uprawnień...</p>
        </div>
      </div>
    );
  }

  if (!isTherapist) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Header />
      
      {/* Hero Section */}
      <section className="py-12 bg-gradient-hanami text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-light mb-4">Panel Masażysty</h1>
          <p className="text-xl text-white/90">
            Witaj {therapistInfo?.therapists?.name || 'Masażysto'}
          </p>
        </div>
      </section>

      {/* Therapist Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="calendar" className="space-y-8">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="calendar" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Kalendarz</span>
              </TabsTrigger>
              <TabsTrigger value="appointments" className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Wizyty</span>
              </TabsTrigger>
              <TabsTrigger value="vouchers" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Bony</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calendar">
              <TherapistCalendar therapistId={therapistInfo?.therapist_id} />
            </TabsContent>

            <TabsContent value="appointments">
              <TherapistAppointments therapistId={therapistInfo?.therapist_id} />
            </TabsContent>

            <TabsContent value="vouchers">
              <VouchersManager />
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default TherapistPanel;