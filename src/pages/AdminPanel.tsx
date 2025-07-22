import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Users, UserCog, Settings, Package, ShoppingBag } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import AppointmentsManager from "@/components/admin/AppointmentsManager";
import TherapistsManager from "@/components/admin/TherapistsManager";
import ServicesManager from "@/components/admin/ServicesManager";
import ProductsManager from "@/components/admin/ProductsManager";
import UsersManager from "@/components/admin/UsersManager";
import BlockedSlotsManager from "@/components/admin/BlockedSlotsManager";

const AdminPanel = () => {
  const { isAdmin, loading } = useAdminCheck();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, loading, navigate]);

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

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Header />
      
      {/* Hero Section */}
      <section className="py-12 bg-gradient-hanami text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-light mb-4">Panel Administracyjny</h1>
          <p className="text-xl text-white/90">
            Zarządzaj wszystkimi aspektami spa
          </p>
        </div>
      </section>

      {/* Admin Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="appointments" className="space-y-8">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="appointments" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Wizyty</span>
              </TabsTrigger>
              <TabsTrigger value="therapists" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Terapeuci</span>
              </TabsTrigger>
              <TabsTrigger value="services" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Usługi</span>
              </TabsTrigger>
              <TabsTrigger value="products" className="flex items-center space-x-2">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Produkty</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center space-x-2">
                <UserCog className="h-4 w-4" />
                <span className="hidden sm:inline">Użytkownicy</span>
              </TabsTrigger>
              <TabsTrigger value="blocked" className="flex items-center space-x-2">
                <ShoppingBag className="h-4 w-4" />
                <span className="hidden sm:inline">Blokady</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="appointments">
              <AppointmentsManager />
            </TabsContent>

            <TabsContent value="therapists">
              <TherapistsManager />
            </TabsContent>

            <TabsContent value="services">
              <ServicesManager />
            </TabsContent>

            <TabsContent value="products">
              <ProductsManager />
            </TabsContent>

            <TabsContent value="users">
              <UsersManager />
            </TabsContent>

            <TabsContent value="blocked">
              <BlockedSlotsManager />
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AdminPanel;