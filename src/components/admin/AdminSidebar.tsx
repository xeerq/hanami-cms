import { 
  BarChart3, 
  Calendar, 
  Users, 
  Settings, 
  Package, 
  UserCog, 
  Link2, 
  Tag, 
  Ticket, 
  Mail,
  FileText,
  Shield,
  ShieldCheck,
  Home
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { 
    title: "Dashboard", 
    url: "/admin", 
    icon: BarChart3,
    exact: true
  },
  { 
    title: "Wizyty", 
    url: "/admin/appointments", 
    icon: Calendar 
  },
  { 
    title: "Zespół i Terapeuci", 
    url: "/admin/team", 
    icon: Users 
  },
  { 
    title: "Usługi", 
    url: "/admin/services", 
    icon: Settings 
  },
  { 
    title: "Przypisania", 
    url: "/admin/assignments", 
    icon: Link2 
  },
  { 
    title: "Produkty", 
    url: "/admin/products", 
    icon: Package 
  },
  { 
    title: "Bony", 
    url: "/admin/vouchers", 
    icon: Ticket 
  },
  { 
    title: "Zamówienia", 
    url: "/admin/orders", 
    icon: Package 
  },
  { 
    title: "Użytkownicy", 
    url: "/admin/users", 
    icon: UserCog 
  },
  { 
    title: "Kategorie", 
    url: "/admin/categories", 
    icon: Tag 
  },
  { 
    title: "Treść", 
    url: "/admin/content", 
    icon: FileText 
  },
  { 
    title: "Email", 
    url: "/admin/notifications", 
    icon: Mail 
  },
  { 
    title: "Logi bezpieczeństwa", 
    url: "/admin/security", 
    icon: ShieldCheck 
  },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar
      className={collapsed ? "w-16" : "w-64"}
      collapsible="icon"
    >
      <SidebarContent className="bg-hanami-primary text-primary-foreground">
        {/* Logo/Brand */}
        <div className="p-4 border-b border-primary-foreground/20">
          <div className="flex items-center space-x-3">
            <Home className="h-8 w-8" />
            {!collapsed && (
              <div>
                <h2 className="text-lg font-semibold">Hanami Spa</h2>
                <p className="text-sm text-primary-foreground/80">Panel Admin</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary-foreground/80 px-4 py-2">
            {!collapsed && "Zarządzanie"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.exact}
                      className={({ isActive: linkActive }) => 
                        `flex items-center space-x-3 px-4 py-3 rounded-lg mx-2 transition-colors ${
                          linkActive || isActive(item.url, item.exact)
                            ? "bg-primary-foreground/20 text-primary-foreground font-medium" 
                            : "hover:bg-primary-foreground/10 text-primary-foreground/80"
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Back to Site */}
        <div className="mt-auto p-4 border-t border-primary-foreground/20">
          <NavLink 
            to="/"
            className="flex items-center space-x-3 text-primary-foreground/80 hover:text-primary-foreground transition-colors"
          >
            <Home className="h-5 w-5" />
            {!collapsed && <span>Powrót do strony</span>}
          </NavLink>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}