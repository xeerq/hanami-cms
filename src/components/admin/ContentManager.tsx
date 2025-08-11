import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus, Edit, Trash2, Eye, EyeOff, Settings, Users, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import EditPageDialog from "./EditPageDialog";
import EditSettingDialog from "./EditSettingDialog";

interface Page {
  id: string;
  slug: string;
  title: string;
  content: any;
  meta_description?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface SiteSetting {
  id: string;
  key: string;
  value: any;
  description?: string;
  updated_at: string;
}

interface TeamMember {
  id: string;
  name: string;
  position: string;
  bio?: string;
  image_url?: string;
  email?: string;
  phone?: string;
  social_links: any;
  display_order: number;
  is_active: boolean;
}

const ContentManager = () => {
  const [pages, setPages] = useState<Page[]>([]);
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [editingSetting, setEditingSetting] = useState<SiteSetting | null>(null);
  const [showPageForm, setShowPageForm] = useState(false);
  const [showPageDialog, setShowPageDialog] = useState(false);
  const [showSettingDialog, setShowSettingDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch pages
      const { data: pagesData, error: pagesError } = await supabase
        .from("pages")
        .select("*")
        .order("updated_at", { ascending: false });

      if (pagesError) throw pagesError;

      // Fetch site settings
      const { data: settingsData, error: settingsError } = await supabase
        .from("site_settings")
        .select("*")
        .order("key");

      if (settingsError) throw settingsError;

      // Fetch team members (admin can see all data)
      const { data: teamData, error: teamError } = await supabase
        .from("team_members")
        .select("*")
        .order("display_order");

      if (teamError) throw teamError;

      setPages(pagesData || []);
      setSettings(settingsData || []);
      setTeamMembers(teamData || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować danych",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePageStatus = async (pageId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("pages")
        .update({ is_published: !currentStatus })
        .eq("id", pageId);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: `Strona została ${!currentStatus ? 'opublikowana' : 'ukryta'}`,
      });

      fetchData();
    } catch (error: any) {
      console.error("Error updating page status:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować statusu strony",
        variant: "destructive",
      });
    }
  };

  const deletePage = async (pageId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć tę stronę?")) return;

    try {
      const { error } = await supabase
        .from("pages")
        .delete()
        .eq("id", pageId);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Strona została usunięta",
      });

      fetchData();
    } catch (error: any) {
      console.error("Error deleting page:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć strony",
        variant: "destructive",
      });
    }
  };

  const handleEditPage = (page: Page) => {
    setEditingPage(page);
    setShowPageDialog(true);
  };

  const handleNewPage = () => {
    setEditingPage(null);
    setShowPageDialog(true);
  };

  const handleEditSetting = (setting: SiteSetting) => {
    setEditingSetting(setting);
    setShowSettingDialog(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Zarządzanie treścią</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hanami-primary mx-auto"></div>
            <p className="mt-2 text-hanami-neutral">Ładowanie treści...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-hanami-primary flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Zarządzanie treścią
              </CardTitle>
              <CardDescription>
                Zarządzaj stronami, ustawieniami i zespołem
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pages" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pages" className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Strony
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Ustawienia
              </TabsTrigger>
              <TabsTrigger value="team" className="flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Zespół
              </TabsTrigger>
            </TabsList>

            {/* Pages Tab */}
            <TabsContent value="pages">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-hanami-primary">Strony</h3>
                  <Button onClick={handleNewPage}>
                    <Plus className="h-4 w-4 mr-2" />
                    Dodaj stronę
                  </Button>
                </div>
                
                <div className="grid gap-4">
                  {pages.map((page) => (
                    <Card key={page.id} className="border-hanami-accent/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h4 className="font-semibold text-hanami-primary">
                                {page.title}
                              </h4>
                              <Badge variant={page.is_published ? "default" : "secondary"}>
                                {page.is_published ? "Opublikowana" : "Ukryta"}
                              </Badge>
                            </div>
                            <p className="text-sm text-hanami-neutral">
                              /{page.slug}
                            </p>
                            {page.meta_description && (
                              <p className="text-xs text-hanami-neutral mt-1">
                                {page.meta_description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => togglePageStatus(page.id, page.is_published)}
                            >
                              {page.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPage(page)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deletePage(page.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-hanami-primary">Ustawienia strony</h3>
                
                <div className="grid gap-4">
                  {settings.map((setting) => (
                    <Card key={setting.id} className="border-hanami-accent/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-hanami-primary capitalize">
                              {setting.key.replace('_', ' ')}
                            </h4>
                            {setting.description && (
                              <p className="text-sm text-hanami-neutral">
                                {setting.description}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditSetting(setting)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Team Tab */}
            <TabsContent value="team">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-hanami-primary">Zespół</h3>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Dodaj członka zespołu
                  </Button>
                </div>
                
                <div className="grid gap-4">
                  {teamMembers.map((member) => (
                    <Card key={member.id} className="border-hanami-accent/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-hanami-secondary rounded-full flex items-center justify-center">
                              {member.image_url ? (
                                <img 
                                  src={member.image_url} 
                                  alt={member.name}
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              ) : (
                                <Users className="h-6 w-6 text-hanami-primary" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-semibold text-hanami-primary">
                                {member.name}
                              </h4>
                              <p className="text-sm text-hanami-neutral">
                                {member.position}
                              </p>
                              <Badge variant={member.is_active ? "default" : "secondary"}>
                                {member.is_active ? "Aktywny" : "Nieaktywny"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <EditPageDialog
        open={showPageDialog}
        onOpenChange={setShowPageDialog}
        onSuccess={fetchData}
        page={editingPage}
      />

      <EditSettingDialog
        open={showSettingDialog}
        onOpenChange={setShowSettingDialog}
        onSuccess={fetchData}
        setting={editingSetting}
      />
    </div>
  );
};

export default ContentManager;