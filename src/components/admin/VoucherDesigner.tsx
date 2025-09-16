import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Save, Eye, Palette, Type, Layout, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DesignConfig {
  layout: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  fonts: {
    header: string;
    body: string;
    sizes: {
      title: string;
      subtitle: string;
      content: string;
      footer: string;
    };
  };
  spacing: {
    padding: string;
    margins: string;
    lineHeight: string;
  };
  elements: {
    showLogo: boolean;
    showBorder: boolean;
    borderStyle: string;
    borderWidth: string;
    logoSize: string;
  };
}

interface VoucherTemplate {
  id: string;
  name: string;
  description: string;
  design_config: any;
  is_active: boolean;
  is_default: boolean;
}

export const VoucherDesigner: React.FC = () => {
  const [templates, setTemplates] = useState<VoucherTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<VoucherTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [previewData, setPreviewData] = useState({
    ownerName: 'Jan Kowalski',
    serviceName: 'Masaż relaksacyjny',
    value: '200 zł',
    expiryDate: '31.12.2024',
    code: 'VOC123456'
  });

  const defaultConfig: DesignConfig = {
    layout: 'classic',
    colors: {
      primary: '#000000',
      secondary: '#666666',
      accent: '#8B4513',
      background: '#ffffff'
    },
    fonts: {
      header: 'Times New Roman',
      body: 'Times New Roman',
      sizes: {
        title: '16px',
        subtitle: '12px',
        content: '13px',
        footer: '11px'
      }
    },
    spacing: {
      padding: '30px',
      margins: '20px',
      lineHeight: '1.4'
    },
    elements: {
      showLogo: true,
      showBorder: true,
      borderStyle: 'solid',
      borderWidth: '2px',
      logoSize: '140px'
    }
  };

  const [designConfig, setDesignConfig] = useState<DesignConfig>(defaultConfig);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('voucher_templates')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);

      // Load default template
      const defaultTemplate = data?.find(t => t.is_default);
      if (defaultTemplate) {
        setSelectedTemplate(defaultTemplate);
        setDesignConfig(defaultTemplate.design_config as unknown as DesignConfig);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Błąd podczas ładowania szablonów');
    }
  };

  const handleConfigChange = (path: string, value: any) => {
    setDesignConfig(prev => {
      const newConfig = { ...prev };
      const keys = path.split('.');
      let current = newConfig;

      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i] as keyof typeof current] as any;
      }

      current[keys[keys.length - 1] as keyof typeof current] = value;
      return newConfig;
    });
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Nazwa szablonu jest wymagana');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('voucher_templates')
        .insert({
          name: templateName,
          description: templateDescription,
          design_config: designConfig as any,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Szablon został zapisany');
      setTemplateName('');
      setTemplateDescription('');
      setIsEditing(false);
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Błąd podczas zapisywania szablonu');
    }
  };

  const loadTemplate = (template: VoucherTemplate) => {
    setSelectedTemplate(template);
    setDesignConfig(template.design_config as unknown as DesignConfig);
    setIsEditing(false);
  };

  const generatePreview = () => {
    const config = designConfig;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: ${config.fonts.body};
            margin: 0;
            padding: 20px;
            background: ${config.colors.background};
            color: ${config.colors.primary};
            font-size: ${config.fonts.sizes.content};
            line-height: ${config.spacing.lineHeight};
          }
          
          .voucher-container {
            width: 500px;
            height: 350px;
            padding: ${config.spacing.padding};
            box-sizing: border-box;
            position: relative;
            margin: 20px auto;
            border: ${config.elements.showBorder ? `${config.elements.borderWidth} ${config.elements.borderStyle} ${config.colors.primary}` : 'none'};
            overflow: hidden;
          }
          
          .header {
            text-align: center;
            margin-bottom: 25px;
          }
          
          .salon-title {
            font-size: ${config.fonts.sizes.title};
            font-weight: normal;
            margin: 0 0 8px 0;
            letter-spacing: 1px;
          }
          
          .logo-container {
            margin: 5px 0 8px 0;
            display: ${config.elements.showLogo ? 'flex' : 'none'};
            justify-content: center;
            align-items: center;
          }
          
          .logo-image {
            max-width: ${config.elements.logoSize};
            height: auto;
          }
          
          .subtitle {
            font-size: ${config.fonts.sizes.subtitle};
            margin: 8px 0 0 0;
            font-weight: normal;
          }
          
          .content {
            margin: 25px 0 20px 0;
            font-size: ${config.fonts.sizes.content};
          }
          
          .content-line {
            margin: 18px 0;
            display: flex;
            align-items: baseline;
            min-height: 20px;
          }
          
          .filled-value {
            font-weight: bold;
            white-space: nowrap;
            min-width: fit-content;
          }
          
          .footer {
            position: absolute;
            bottom: 20px;
            left: ${config.spacing.padding};
            right: ${config.spacing.padding};
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          
          .contact-section {
            font-size: ${config.fonts.sizes.footer};
            line-height: 1.3;
            text-align: left;
          }
          
          .validity-section {
            text-align: right;
            font-size: ${config.fonts.sizes.footer};
          }
        </style>
      </head>
      <body>
        <div class="voucher-container">
          <div class="header">
            <div class="salon-title">Salon</div>
            <div class="logo-container">
              <img src="/lovable-uploads/ca126b9c-7595-42ce-ba12-c10c932b3e07.png" alt="Hanami SPA" class="logo-image">
            </div>
            <div class="subtitle">serdecznie zaprasza</div>
          </div>
          
          <div class="content">
            <div class="content-line">
              <span>Panią/Pana: </span>
              <span class="filled-value">${previewData.ownerName}</span>
            </div>
            
            <div style="margin: 12px 0; font-size: ${config.fonts.sizes.content};">
              na zabieg ${previewData.serviceName.toLowerCase()}
            </div>
            
            <div style="margin: 20px 0; line-height: 1.4;">
              Prosimy o kontakt w celu<br>
              ustalenia daty wizyty w Salonie.
            </div>
            
            <div class="content-line">
              <span>o wartości: </span>
              <span class="filled-value">${previewData.value}</span>
            </div>
          </div>
          
          <div class="footer">
            <div class="contact-section">
              tel: 605 412 692<br>
              63-400 Ostrów Wielkopolski,<br>
              ul. Raszkowska 80e
            </div>
            
            <div class="validity-section">
              <div>bon ważny do: <strong>${previewData.expiryDate}</strong></div>
              <div>numer: <strong>${previewData.code}</strong></div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Projektant Bonów
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Editor */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Select
                  value={selectedTemplate?.id || ''}
                  onValueChange={(value) => {
                    const template = templates.find(t => t.id === value);
                    if (template) loadTemplate(template);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz szablon" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} {template.is_default && '(domyślny)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? 'Anuluj' : 'Nowy szablon'}
                </Button>
              </div>

              {isEditing && (
                <Card>
                  <CardHeader>
                    <CardTitle>Zapisz jako nowy szablon</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="templateName">Nazwa szablonu</Label>
                      <Input
                        id="templateName"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="np. Elegancki złoty"
                      />
                    </div>
                    <div>
                      <Label htmlFor="templateDescription">Opis</Label>
                      <Textarea
                        id="templateDescription"
                        value={templateDescription}
                        onChange={(e) => setTemplateDescription(e.target.value)}
                        placeholder="Krótki opis szablonu..."
                      />
                    </div>
                    <Button onClick={saveTemplate} className="w-full">
                      <Save className="h-4 w-4 mr-2" />
                      Zapisz szablon
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Tabs defaultValue="colors" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="colors">Kolory</TabsTrigger>
                  <TabsTrigger value="fonts">Czcionki</TabsTrigger>
                  <TabsTrigger value="layout">Układ</TabsTrigger>
                  <TabsTrigger value="elements">Elementy</TabsTrigger>
                </TabsList>

                <TabsContent value="colors" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Kolor główny</Label>
                      <Input
                        type="color"
                        value={designConfig.colors.primary}
                        onChange={(e) => handleConfigChange('colors.primary', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Kolor drugorzędny</Label>
                      <Input
                        type="color"
                        value={designConfig.colors.secondary}
                        onChange={(e) => handleConfigChange('colors.secondary', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Kolor akcentu</Label>
                      <Input
                        type="color"
                        value={designConfig.colors.accent}
                        onChange={(e) => handleConfigChange('colors.accent', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Tło</Label>
                      <Input
                        type="color"
                        value={designConfig.colors.background}
                        onChange={(e) => handleConfigChange('colors.background', e.target.value)}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="fonts" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Czcionka nagłówka</Label>
                      <Select
                        value={designConfig.fonts.header}
                        onValueChange={(value) => handleConfigChange('fonts.header', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                          <SelectItem value="Arial">Arial</SelectItem>
                          <SelectItem value="Georgia">Georgia</SelectItem>
                          <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Czcionka treści</Label>
                      <Select
                        value={designConfig.fonts.body}
                        onValueChange={(value) => handleConfigChange('fonts.body', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                          <SelectItem value="Arial">Arial</SelectItem>
                          <SelectItem value="Georgia">Georgia</SelectItem>
                          <SelectItem value="Open Sans">Open Sans</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Rozmiar tytułu ({designConfig.fonts.sizes.title})</Label>
                      <Slider
                        value={[parseInt(designConfig.fonts.sizes.title)]}
                        onValueChange={([value]) => handleConfigChange('fonts.sizes.title', `${value}px`)}
                        min={12}
                        max={24}
                        step={1}
                      />
                    </div>
                    <div>
                      <Label>Rozmiar treści ({designConfig.fonts.sizes.content})</Label>
                      <Slider
                        value={[parseInt(designConfig.fonts.sizes.content)]}
                        onValueChange={([value]) => handleConfigChange('fonts.sizes.content', `${value}px`)}
                        min={10}
                        max={18}
                        step={1}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="layout" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Padding ({designConfig.spacing.padding})</Label>
                      <Slider
                        value={[parseInt(designConfig.spacing.padding)]}
                        onValueChange={([value]) => handleConfigChange('spacing.padding', `${value}px`)}
                        min={10}
                        max={50}
                        step={5}
                      />
                    </div>
                    <div>
                      <Label>Marginesy ({designConfig.spacing.margins})</Label>
                      <Slider
                        value={[parseInt(designConfig.spacing.margins)]}
                        onValueChange={([value]) => handleConfigChange('spacing.margins', `${value}px`)}
                        min={5}
                        max={40}
                        step={5}
                      />
                    </div>
                    <div>
                      <Label>Wysokość linii ({designConfig.spacing.lineHeight})</Label>
                      <Slider
                        value={[parseFloat(designConfig.spacing.lineHeight) * 10]}
                        onValueChange={([value]) => handleConfigChange('spacing.lineHeight', (value / 10).toString())}
                        min={10}
                        max={20}
                        step={1}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="elements" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Pokaż logo</Label>
                      <Switch
                        checked={designConfig.elements.showLogo}
                        onCheckedChange={(checked) => handleConfigChange('elements.showLogo', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Pokaż obramowanie</Label>
                      <Switch
                        checked={designConfig.elements.showBorder}
                        onCheckedChange={(checked) => handleConfigChange('elements.showBorder', checked)}
                      />
                    </div>
                    {designConfig.elements.showBorder && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Styl obramowania</Label>
                          <Select
                            value={designConfig.elements.borderStyle}
                            onValueChange={(value) => handleConfigChange('elements.borderStyle', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="solid">Ciągła</SelectItem>
                              <SelectItem value="dashed">Przerywana</SelectItem>
                              <SelectItem value="dotted">Kropkowana</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Grubość obramowania ({designConfig.elements.borderWidth})</Label>
                          <Slider
                            value={[parseInt(designConfig.elements.borderWidth)]}
                            onValueChange={([value]) => handleConfigChange('elements.borderWidth', `${value}px`)}
                            min={1}
                            max={5}
                            step={1}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Preview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Podgląd
                </h3>
              </div>
              
              <div className="border rounded-lg p-4 bg-gray-50">
                <iframe
                  srcDoc={generatePreview()}
                  className="w-full h-96 border-0"
                  title="Podgląd bonu"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Dane testowe</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Właściciel</Label>
                    <Input
                      value={previewData.ownerName}
                      onChange={(e) => setPreviewData(prev => ({ ...prev, ownerName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Usługa</Label>
                    <Input
                      value={previewData.serviceName}
                      onChange={(e) => setPreviewData(prev => ({ ...prev, serviceName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Wartość</Label>
                    <Input
                      value={previewData.value}
                      onChange={(e) => setPreviewData(prev => ({ ...prev, value: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Data ważności</Label>
                    <Input
                      value={previewData.expiryDate}
                      onChange={(e) => setPreviewData(prev => ({ ...prev, expiryDate: e.target.value }))}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};