import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Save, 
  Eye, 
  Palette, 
  Type, 
  Square, 
  Circle as LucideCircle,
  Layers,
  Undo,
  Redo,
  Trash2,
  Copy,
  Move,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Canvas, Text, Rect, Circle, FabricObject } from 'fabric';

interface CanvasElement {
  id: string;
  type: 'text' | 'shape' | 'image';
  name: string;
  visible: boolean;
  locked: boolean;
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<Canvas | null>(null);
  const [activeObject, setActiveObject] = useState<FabricObject | null>(null);
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
  const [templates, setTemplates] = useState<VoucherTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<VoucherTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width: 500,
      height: 350,
      backgroundColor: '#ffffff',
      selection: true,
    });

    // Setup canvas events
    canvas.on('selection:created', (e: any) => {
      setActiveObject(e.selected?.[0] || null);
    });

    canvas.on('selection:updated', (e: any) => {
      setActiveObject(e.selected?.[0] || null);
    });

    canvas.on('selection:cleared', () => {
      setActiveObject(null);
    });

    canvas.on('object:added', () => {
      updateCanvasElements(canvas);
      saveToHistory(canvas);
    });

    canvas.on('object:removed', () => {
      updateCanvasElements(canvas);
      saveToHistory(canvas);
    });

    canvas.on('object:modified', () => {
      saveToHistory(canvas);
    });

    setFabricCanvas(canvas);
    addDefaultElements(canvas);

    return () => {
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    loadTemplates();
  }, []);

  const addDefaultElements = (canvas: Canvas) => {
    // Add salon title
    const salonTitle = new Text('Salon', {
      left: 250,
      top: 30,
      fontSize: 16,
      fontFamily: 'Times New Roman',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
    });
    canvas.add(salonTitle);

    // Add logo placeholder
    const logoRect = new Rect({
      left: 250,
      top: 60,
      width: 140,
      height: 50,
      fill: 'rgba(200, 200, 200, 0.5)',
      stroke: '#ccc',
      strokeDashArray: [5, 5],
      originX: 'center',
      originY: 'center',
    });
    canvas.add(logoRect);

    // Add subtitle
    const subtitle = new Text('serdecznie zaprasza', {
      left: 250,
      top: 90,
      fontSize: 12,
      fontFamily: 'Times New Roman',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
    });
    canvas.add(subtitle);

    // Add content
    const ownerLabel = new Text('Panią/Pana:', {
      left: 50,
      top: 130,
      fontSize: 13,
      fontFamily: 'Times New Roman',
    });
    canvas.add(ownerLabel);

    const ownerName = new Text('Jan Kowalski', {
      left: 130,
      top: 130,
      fontSize: 13,
      fontFamily: 'Times New Roman',
      fontWeight: 'bold',
    });
    canvas.add(ownerName);

    const serviceText = new Text('na zabieg masaż relaksacyjny', {
      left: 50,
      top: 155,
      fontSize: 13,
      fontFamily: 'Times New Roman',
    });
    canvas.add(serviceText);

    const contactText = new Text('Prosimy o kontakt w celu\nustalenia daty wizyty w Salonie.', {
      left: 50,
      top: 180,
      fontSize: 13,
      fontFamily: 'Times New Roman',
      lineHeight: 1.4,
    });
    canvas.add(contactText);

    const valueLabel = new Text('o wartości:', {
      left: 50,
      top: 220,
      fontSize: 13,
      fontFamily: 'Times New Roman',
    });
    canvas.add(valueLabel);

    const valueAmount = new Text('200 zł', {
      left: 120,
      top: 220,
      fontSize: 13,
      fontFamily: 'Times New Roman',
      fontWeight: 'bold',
    });
    canvas.add(valueAmount);

    // Footer
    const contactInfo = new Text('tel: 605 412 692\n63-400 Ostrów Wielkopolski,\nul. Raszkowska 80e', {
      left: 30,
      top: 280,
      fontSize: 11,
      fontFamily: 'Times New Roman',
      lineHeight: 1.3,
    });
    canvas.add(contactInfo);

    const validity = new Text('bon ważny do: 31.12.2024\nnumer: VOC123456', {
      left: 350,
      top: 290,
      fontSize: 11,
      fontFamily: 'Times New Roman',
      textAlign: 'right',
    });
    canvas.add(validity);

    canvas.renderAll();
  };

  const updateCanvasElements = (canvas: Canvas) => {
    const objects = canvas.getObjects();
    const elements: CanvasElement[] = objects.map((obj: any, index) => ({
      id: `element-${index}`,
      type: obj.type === 'text' ? 'text' : obj.type === 'image' ? 'image' : 'shape',
      name: obj.type === 'text' ? (obj.text || 'Tekst') : `${obj.type} ${index + 1}`,
      visible: obj.visible !== false,
      locked: !obj.selectable,
    }));
    setCanvasElements(elements);
  };

  const saveToHistory = (canvas: Canvas) => {
    const json = JSON.stringify(canvas.toJSON());
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(json);
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  };

  const undo = () => {
    if (historyIndex > 0 && fabricCanvas) {
      const prevState = history[historyIndex - 1];
      fabricCanvas.loadFromJSON(prevState, () => {
        fabricCanvas.renderAll();
        setHistoryIndex(prev => prev - 1);
        updateCanvasElements(fabricCanvas);
      });
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1 && fabricCanvas) {
      const nextState = history[historyIndex + 1];
      fabricCanvas.loadFromJSON(nextState, () => {
        fabricCanvas.renderAll();
        setHistoryIndex(prev => prev + 1);
        updateCanvasElements(fabricCanvas);
      });
    }
  };

  const addText = () => {
    if (!fabricCanvas) return;
    
    const text = new Text('Nowy tekst', {
      left: 100,
      top: 100,
      fontSize: 16,
      fontFamily: 'Times New Roman',
    });
    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    fabricCanvas.renderAll();
  };

  const addRectangle = () => {
    if (!fabricCanvas) return;
    
    const rect = new Rect({
      left: 100,
      top: 100,
      width: 100,
      height: 60,
      fill: 'rgba(255, 0, 0, 0.3)',
      stroke: '#ff0000',
      strokeWidth: 2,
    });
    fabricCanvas.add(rect);
    fabricCanvas.setActiveObject(rect);
    fabricCanvas.renderAll();
  };

  const addCircle = () => {
    if (!fabricCanvas) return;
    
    const circle = new Circle({
      left: 100,
      top: 100,
      radius: 30,
      fill: 'rgba(0, 255, 0, 0.3)',
      stroke: '#00ff00',
      strokeWidth: 2,
    });
    fabricCanvas.add(circle);
    fabricCanvas.setActiveObject(circle);
    fabricCanvas.renderAll();
  };

  const deleteSelected = () => {
    if (!fabricCanvas || !activeObject) return;
    fabricCanvas.remove(activeObject);
    fabricCanvas.renderAll();
  };

  const duplicateSelected = () => {
    if (!fabricCanvas || !activeObject) return;
    
    const props = {
      left: (activeObject.left || 0) + 10,
      top: (activeObject.top || 0) + 10,
    };
    
    if (activeObject.type === 'text') {
      const cloned = new Text((activeObject as any).text || '', props);
      fabricCanvas.add(cloned);
      fabricCanvas.setActiveObject(cloned);
    } else if (activeObject.type === 'rect') {
      const cloned = new Rect({ width: 100, height: 60, fill: 'red', ...props });
      fabricCanvas.add(cloned);
      fabricCanvas.setActiveObject(cloned);
    } else if (activeObject.type === 'circle') {
      const cloned = new Circle({ radius: 30, fill: 'green', ...props });
      fabricCanvas.add(cloned);
      fabricCanvas.setActiveObject(cloned);
    }
    
    fabricCanvas.renderAll();
  };

  const alignLeft = () => {
    if (!fabricCanvas || !activeObject) return;
    activeObject.set({ left: 30 });
    fabricCanvas.renderAll();
  };

  const alignCenter = () => {
    if (!fabricCanvas || !activeObject) return;
    activeObject.set({ left: 250, originX: 'center' });
    fabricCanvas.renderAll();
  };

  const alignRight = () => {
    if (!fabricCanvas || !activeObject) return;
    activeObject.set({ left: 470, originX: 'right' });
    fabricCanvas.renderAll();
  };

  const updateObjectProperty = (property: string, value: any) => {
    if (!activeObject) return;
    (activeObject as any).set(property, value);
    fabricCanvas?.renderAll();
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('voucher_templates')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Błąd podczas ładowania szablonów');
    }
  };

  const saveTemplate = async () => {
    if (!templateName.trim() || !fabricCanvas) {
      toast.error('Nazwa szablonu jest wymagana');
      return;
    }

    try {
      const canvasData = JSON.stringify(fabricCanvas.toJSON());
      const { data, error } = await supabase
        .from('voucher_templates')
        .insert({
          name: templateName,
          description: templateDescription,
          design_config: { canvasData },
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
    if (!fabricCanvas) return;
    
    try {
      const canvasData = template.design_config?.canvasData;
      if (canvasData) {
        fabricCanvas.loadFromJSON(canvasData, () => {
          fabricCanvas.renderAll();
          updateCanvasElements(fabricCanvas);
          setSelectedTemplate(template);
          toast.success('Szablon został wczytany');
        });
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('Błąd podczas wczytywania szablonu');
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Top Toolbar */}
      <div className="border-b p-4 bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Projektant Bonów WYSIWYG</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={historyIndex <= 0}
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
            >
              <Redo className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Select
              value={selectedTemplate?.id || ''}
              onValueChange={(value) => {
                const template = templates.find(t => t.id === value);
                if (template) loadTemplate(template);
              }}
            >
              <SelectTrigger className="w-48">
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
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Anuluj' : 'Zapisz jako szablon'}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Toolbar */}
        <Card className="w-64 m-0 rounded-none border-r">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Narzędzia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={addText}
            >
              <Type className="h-4 w-4 mr-2" />
              Dodaj tekst
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={addRectangle}
            >
              <Square className="h-4 w-4 mr-2" />
              Prostokąt
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={addCircle}
            >
              <LucideCircle className="h-4 w-4 mr-2" />
              Koło
            </Button>
            
            <Separator />
            
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={duplicateSelected}
              disabled={!activeObject}
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplikuj
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-destructive"
              onClick={deleteSelected}
              disabled={!activeObject}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Usuń
            </Button>

            <Separator />

            <div className="space-y-2">
              <Label className="text-xs font-medium">Wyrównanie</Label>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={alignLeft}
                  disabled={!activeObject}
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={alignCenter}
                  disabled={!activeObject}
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={alignRight}
                  disabled={!activeObject}
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-8">
          <div className="bg-white shadow-lg rounded-lg p-4">
            <canvas ref={canvasRef} className="border" />
          </div>
        </div>

        {/* Right Properties Panel */}
        <Card className="w-80 m-0 rounded-none border-l">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Właściwości</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing && (
              <Card className="mb-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Zapisz szablon</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor="templateName" className="text-xs">Nazwa</Label>
                       <Input
                         id="templateName"
                         value={templateName}
                         onChange={(e) => setTemplateName(e.target.value)}
                         placeholder="np. Elegancki złoty"
                       />
                  </div>
                  <div>
                    <Label htmlFor="templateDescription" className="text-xs">Opis</Label>
                    <Textarea
                      id="templateDescription"
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder="Krótki opis..."
                      className="h-16 text-xs"
                    />
                  </div>
                  <Button onClick={saveTemplate} size="sm" className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    Zapisz
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeObject ? (
              <div className="space-y-4">
                <h3 className="font-medium">Wybrany obiekt</h3>
                
                {activeObject.type === 'text' && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Tekst</Label>
                       <Input
                         value={(activeObject as any).text || ''}
                         onChange={(e) => updateObjectProperty('text', e.target.value)}
                       />
                    </div>
                    <div>
                      <Label className="text-xs">Rozmiar czcionki</Label>
                      <Slider
                        value={[(activeObject as any).fontSize || 16]}
                        onValueChange={([value]) => updateObjectProperty('fontSize', value)}
                        min={8}
                        max={72}
                        step={1}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Kolor</Label>
                      <Input
                        type="color"
                        value={(activeObject as any).fill as string || '#000000'}
                        onChange={(e) => updateObjectProperty('fill', e.target.value)}
                        className="h-8"
                      />
                    </div>
                  </div>
                )}

                {(activeObject.type === 'rect' || activeObject.type === 'circle') && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Kolor wypełnienia</Label>
                      <Input
                        type="color"
                        value={((activeObject as any).fill as string) || '#000000'}
                        onChange={(e) => updateObjectProperty('fill', e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Kolor obramowania</Label>
                      <Input
                        type="color"
                        value={((activeObject as any).stroke as string) || '#000000'}
                        onChange={(e) => updateObjectProperty('stroke', e.target.value)}
                        className="h-8"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Pozycja X</Label>
                      <Input
                        type="number"
                        value={Math.round(activeObject.left || 0).toString()}
                        onChange={(e) => updateObjectProperty('left', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Pozycja Y</Label>
                      <Input
                        type="number"
                        value={Math.round(activeObject.top || 0).toString()}
                        onChange={(e) => updateObjectProperty('top', Number(e.target.value))}
                      />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Wybierz obiekt aby edytować jego właściwości
              </div>
            )}

            <Separator className="my-4" />

            {/* Layers Panel */}
            <div>
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Warstwy
              </h3>
              <ScrollArea className="h-32">
                <div className="space-y-1">
                  {canvasElements.map((element, index) => (
                    <div
                      key={element.id}
                      className="flex items-center justify-between p-2 rounded text-xs hover:bg-muted cursor-pointer"
                      onClick={() => {
                        const objects = fabricCanvas?.getObjects();
                        if (objects && objects[index]) {
                          fabricCanvas?.setActiveObject(objects[index]);
                          fabricCanvas?.renderAll();
                        }
                      }}
                    >
                      <span className="truncate">{element.name}</span>
                      <div className="flex items-center gap-1">
                        <Eye className={`h-3 w-3 ${element.visible ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};