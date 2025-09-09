import { useEffect } from "react";
import { useNavigate, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AppointmentsManager from "@/components/admin/AppointmentsManager";
import { UnifiedTeamManager } from "@/components/admin/UnifiedTeamManager";
import ServicesManager from "@/components/admin/ServicesManager";
import ProductsManager from "@/components/admin/ProductsManager";
import CategoriesManager from "@/components/admin/CategoriesManager";
import UsersManager from "@/components/admin/UsersManager";
import TherapistServicesManager from "@/components/admin/TherapistServicesManager";
import ContentManager from "@/components/admin/ContentManager";
import { VouchersManager } from "@/components/admin/VouchersManager";
import { NotificationManager } from "@/components/admin/NotificationManager";
import { SecurityAuditLog } from "@/components/admin/SecurityAuditLog";
import OrdersManager from "@/components/admin/OrdersManager";

const AdminPanel = () => {
  const { isAdmin, loading } = useAdminCheck();
  const navigate = useNavigate();

  useEffect(() => {
    console.log("AdminPanel - isAdmin:", isAdmin, "loading:", loading);
    if (!loading && !isAdmin) {
      console.log("Redirecting to home - no admin access");
      navigate("/");
    }
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Sprawdzanie uprawnień...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Top Header */}
          <header className="h-16 border-b border-border bg-card flex items-center px-6 shadow-sm">
            <SidebarTrigger className="mr-4" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-foreground">
                Panel Administracyjny
              </h1>
            </div>
            <div className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('pl-PL', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </header>
          
          {/* Main Content Area */}
          <main className="flex-1 overflow-auto">
            <div className="p-6">
              <Routes>
                <Route index element={<AdminDashboard />} />
                <Route path="appointments" element={<AppointmentsManager />} />
                <Route path="team" element={<UnifiedTeamManager />} />
                <Route path="services" element={<ServicesManager />} />
                <Route path="assignments" element={<TherapistServicesManager />} />
                <Route path="products" element={<ProductsManager />} />
                <Route path="vouchers" element={<VouchersManager />} />
                <Route path="orders" element={<OrdersManager />} />
                <Route path="users" element={<UsersManager />} />
                <Route path="categories" element={<CategoriesManager />} />
                <Route path="content" element={<ContentManager />} />
                <Route path="notifications" element={<NotificationManager />} />
                <Route path="security" element={<SecurityAuditLog />} />
                {/* Redirect any unknown admin routes to dashboard */}
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminPanel;