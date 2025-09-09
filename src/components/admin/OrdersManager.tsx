import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Eye, Package, TrendingUp, ShoppingCart, Euro, Calendar } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { usePagination, usePaginatedData } from "@/hooks/usePagination";
import { PaginationControlsComponent } from "@/components/ui/pagination-controls";

interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  delivery_address?: any;
  order_items?: OrderItem[];
}

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  products?: {
    name: string;
    image_url?: string;
  };
}

interface OrderStats {
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  total_revenue: number;
  avg_order_value: number;
}

const OrdersManager = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  const pagination = usePagination(filteredOrders.length, 10);
  const paginatedOrders = usePaginatedData(filteredOrders, pagination);

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, statusFilter]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (
              name,
              image_url
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać zamówień",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_order_statistics');
      if (error) throw error;
      setStats(data as unknown as OrderStats);
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    setFilteredOrders(filtered);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(orders.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
          : order
      ));

      toast({
        title: "Sukces",
        description: "Status zamówienia został zaktualizowany",
      });

      fetchStats(); // Refresh stats
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować statusu zamówienia",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: "Oczekujące", variant: "secondary" as const },
      processing: { label: "W realizacji", variant: "default" as const },
      shipped: { label: "Wysłane", variant: "outline" as const },
      delivered: { label: "Dostarczone", variant: "default" as const },
      cancelled: { label: "Anulowane", variant: "destructive" as const }
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: "secondary" as const };
    
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Zarządzanie Zamówieniami</h1>
          <p className="text-muted-foreground">Przeglądaj i zarządzaj zamówieniami ze sklepu</p>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wszystkie zamówienia</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_orders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Oczekujące</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pending_orders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Zrealizowane</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed_orders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Łączny przychód</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_revenue.toFixed(2)} zł</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Średnia wartość</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avg_order_value.toFixed(2)} zł</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtry</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Szukaj po nazwie klienta, email lub ID zamówienia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtruj po statusie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie statusy</SelectItem>
                <SelectItem value="pending">Oczekujące</SelectItem>
                <SelectItem value="processing">W realizacji</SelectItem>
                <SelectItem value="shipped">Wysłane</SelectItem>
                <SelectItem value="delivered">Dostarczone</SelectItem>
                <SelectItem value="cancelled">Anulowane</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista Zamówień</CardTitle>
          <CardDescription>
            Znaleziono {filteredOrders.length} zamówień
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Zamówienia</TableHead>
                <TableHead>Klient</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Wartość</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">
                    {order.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{order.customer_name || 'Użytkownik'}</div>
                      <div className="text-sm text-muted-foreground">{order.customer_email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="font-medium">{order.total_amount.toFixed(2)} zł</TableCell>
                  <TableCell>
                    {format(new Date(order.created_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Szczegóły Zamówienia</DialogTitle>
                            <DialogDescription>
                              Zamówienie #{selectedOrder?.id.slice(0, 8)}
                            </DialogDescription>
                          </DialogHeader>
                          {selectedOrder && (
                            <OrderDetailsModal 
                              order={selectedOrder} 
                              onStatusUpdate={updateOrderStatus}
                            />
                          )}
                        </DialogContent>
                      </Dialog>

                      <Select 
                        value={order.status} 
                        onValueChange={(newStatus) => updateOrderStatus(order.id, newStatus)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Oczekujące</SelectItem>
                          <SelectItem value="processing">W realizacji</SelectItem>
                          <SelectItem value="shipped">Wysłane</SelectItem>
                          <SelectItem value="delivered">Dostarczone</SelectItem>
                          <SelectItem value="cancelled">Anulowane</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-6">
            <PaginationControlsComponent
              pagination={pagination}
              totalItems={filteredOrders.length}
              showPageSizeSelector={true}
              showPageInfo={true}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface OrderDetailsModalProps {
  order: Order;
  onStatusUpdate: (orderId: string, newStatus: string) => void;
}

const OrderDetailsModal = ({ order, onStatusUpdate }: OrderDetailsModalProps) => {
  return (
    <div className="space-y-6">
      {/* Order Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Informacje o zamówieniu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">ID Zamówienia</label>
              <p className="font-mono">{order.id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="mt-1">
                <Select 
                  value={order.status} 
                  onValueChange={(newStatus) => onStatusUpdate(order.id, newStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Oczekujące</SelectItem>
                    <SelectItem value="processing">W realizacji</SelectItem>
                    <SelectItem value="shipped">Wysłane</SelectItem>
                    <SelectItem value="delivered">Dostarczone</SelectItem>
                    <SelectItem value="cancelled">Anulowane</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Wartość całkowita</label>
              <p className="text-lg font-bold">{order.total_amount.toFixed(2)} zł</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Data zamówienia</label>
              <p>{format(new Date(order.created_at), 'dd.MM.yyyy HH:mm', { locale: pl })}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dane klienta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Imię i nazwisko</label>
              <p>{order.customer_name || 'Nie podano'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p>{order.customer_email || 'Nie podano'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Telefon</label>
              <p>{order.customer_phone || 'Nie podano'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delivery Address */}
      {order.delivery_address && Object.keys(order.delivery_address).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Adres dostawy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(order.delivery_address).map(([key, value]) => (
                <div key={key}>
                  <label className="text-sm font-medium text-muted-foreground capitalize">
                    {key.replace('_', ' ')}
                  </label>
                  <p>{value as string}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Produkty w zamówieniu</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produkt</TableHead>
                <TableHead>Ilość</TableHead>
                <TableHead>Cena jednostkowa</TableHead>
                <TableHead>Wartość</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.order_items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      {item.products?.image_url && (
                        <img 
                          src={item.products.image_url} 
                          alt={item.products.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                      )}
                      <span>{item.products?.name || 'Nieznany produkt'}</span>
                    </div>
                  </TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.price.toFixed(2)} zł</TableCell>
                  <TableCell className="font-medium">
                    {(item.quantity * item.price).toFixed(2)} zł
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdersManager;