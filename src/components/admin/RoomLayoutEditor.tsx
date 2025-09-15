import { useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZoomIn, ZoomOut, RotateCcw, Move } from "lucide-react";

interface Room {
  id: string;
  name: string;
  capacity: number;
  floor_area?: number;
  floor_plan_data: any;
  is_active: boolean;
}

interface RoomLayoutEditorProps {
  rooms: Room[];
}

interface RoomPosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export const RoomLayoutEditor = ({ rooms }: RoomLayoutEditorProps) => {
  const [scale, setScale] = useState(1);
  const [positions, setPositions] = useState<RoomPosition[]>(() =>
    rooms.map((room, index) => ({
      id: room.id,
      x: 50 + (index % 4) * 150,
      y: 50 + Math.floor(index / 4) * 120,
      width: Math.max(80, (room.floor_area || 15) * 4),
      height: Math.max(60, (room.floor_area || 15) * 3),
      rotation: 0
    }))
  );
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const handleZoomIn = () => setScale(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev / 1.2, 0.3));
  const handleResetView = () => {
    setScale(1);
    setSelectedRoom(null);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, roomId: string) => {
    e.preventDefault();
    setSelectedRoom(roomId);
    setIsDragging(true);
    
    const svg = svgRef.current;
    if (!svg) return;
    
    const rect = svg.getBoundingClientRect();
    const roomPos = positions.find(p => p.id === roomId);
    if (!roomPos) return;
    
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    
    setDragOffset({
      x: clientX / scale - roomPos.x,
      y: clientY / scale - roomPos.y
    });
  }, [positions, scale]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !selectedRoom) return;
    
    const svg = svgRef.current;
    if (!svg) return;
    
    const rect = svg.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    
    const newX = (clientX / scale) - dragOffset.x;
    const newY = (clientY / scale) - dragOffset.y;
    
    setPositions(prev => prev.map(pos => 
      pos.id === selectedRoom 
        ? { ...pos, x: Math.max(0, newX), y: Math.max(0, newY) }
        : pos
    ));
  }, [isDragging, selectedRoom, dragOffset, scale]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  const getRoomColor = (room: Room) => {
    if (!room.is_active) return "#94a3b8"; // slate-400
    switch (room.capacity) {
      case 1: return "#10b981"; // emerald-500
      case 2: return "#3b82f6"; // blue-500
      default: return "#8b5cf6"; // violet-500
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
        <Button size="sm" variant="outline" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={handleResetView}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          <Move className="h-4 w-4" />
          Przeciągnij pomieszczenia aby zmienić układ
        </div>
        <Badge variant="outline">
          Powiększenie: {Math.round(scale * 100)}%
        </Badge>
      </div>

      {/* Layout Area */}
      <Card>
        <CardContent className="p-0">
          <div className="relative bg-grid-pattern bg-muted/10 min-h-[500px] overflow-hidden">
            <svg
              ref={svgRef}
              className="w-full h-[500px] cursor-move"
              viewBox={`0 0 800 500`}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
            >
              {/* Grid pattern */}
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              
              {/* Rooms */}
              {positions.map((pos) => {
                const room = rooms.find(r => r.id === pos.id);
                if (!room) return null;
                
                const isSelected = selectedRoom === pos.id;
                
                return (
                  <g key={pos.id}>
                    {/* Room rectangle */}
                    <rect
                      x={pos.x}
                      y={pos.y}
                      width={pos.width}
                      height={pos.height}
                      fill={getRoomColor(room)}
                      stroke={isSelected ? "#1f2937" : "#6b7280"}
                      strokeWidth={isSelected ? "3" : "2"}
                      strokeDasharray={room.is_active ? "none" : "5,5"}
                      rx="8"
                      className="cursor-move transition-all duration-200"
                      onMouseDown={(e) => handleMouseDown(e, pos.id)}
                      opacity={room.is_active ? 0.8 : 0.4}
                    />
                    
                    {/* Room label */}
                    <text
                      x={pos.x + pos.width / 2}
                      y={pos.y + pos.height / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-white font-medium text-sm pointer-events-none select-none"
                      style={{ fontSize: '12px' }}
                    >
                      {room.name}
                    </text>
                    
                    {/* Capacity indicator */}
                    <circle
                      cx={pos.x + pos.width - 15}
                      cy={pos.y + 15}
                      r="8"
                      fill="rgba(0,0,0,0.6)"
                      className="pointer-events-none"
                    />
                    <text
                      x={pos.x + pos.width - 15}
                      y={pos.y + 15}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-white font-bold text-xs pointer-events-none"
                      style={{ fontSize: '10px' }}
                    >
                      {room.capacity}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-emerald-500 rounded"></div>
          <span className="text-sm">1 osoba</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-sm">2 osoby</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-violet-500 rounded"></div>
          <span className="text-sm">3+ osób</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-slate-400 rounded border-2 border-dashed border-slate-600"></div>
          <span className="text-sm">Nieaktywne</span>
        </div>
      </div>
      
      {/* Room details */}
      {selectedRoom && (
        <Card>
          <CardContent className="p-4">
            {(() => {
              const room = rooms.find(r => r.id === selectedRoom);
              if (!room) return null;
              
              return (
                <div>
                  <h3 className="font-semibold mb-2">{room.name}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>Pojemność: {room.capacity} osób</div>
                    {room.floor_area && <div>Powierzchnia: {room.floor_area} m²</div>}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
};