import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, ShoppingCart, DollarSign, Package, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SalesData {
  productName: string;
  quantity: number;
  revenue: number;
  category: string;
}

interface DailySales {
  date: string;
  revenue: number;
  orders: number;
}

interface TopProduct {
  name: string;
  totalSold: number;
  revenue: number;
  category: string;
}

const ProductSalesAnalytics = () => {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [timeRange, setTimeRange] = useState("30");
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const { toast } = useToast();

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const daysAgo = parseInt(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Fetch orders with products
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id,
          total_amount,
          created_at,
          order_items (
            quantity,
            price,
            products (
              name,
              category
            )
          )
        `)
        .gte("created_at", startDateStr)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      // Process sales data
      const salesMap = new Map<string, SalesData>();
      const dailySalesMap = new Map<string, DailySales>();
      let revenue = 0;
      let orders = ordersData?.length || 0;

      ordersData?.forEach(order => {
        revenue += Number(order.total_amount);
        
        // Daily sales
        const orderDate = new Date(order.created_at).toISOString().split('T')[0];
        if (dailySalesMap.has(orderDate)) {
          const existing = dailySalesMap.get(orderDate)!;
          dailySalesMap.set(orderDate, {
            date: orderDate,
            revenue: existing.revenue + Number(order.total_amount),
            orders: existing.orders + 1
          });
        } else {
          dailySalesMap.set(orderDate, {
            date: orderDate,
            revenue: Number(order.total_amount),
            orders: 1
          });
        }

        // Product sales
        order.order_items?.forEach(item => {
          const productName = item.products?.name || 'Unknown';
          const category = item.products?.category || 'Other';
          
          if (salesMap.has(productName)) {
            const existing = salesMap.get(productName)!;
            salesMap.set(productName, {
              ...existing,
              quantity: existing.quantity + item.quantity,
              revenue: existing.revenue + (item.quantity * Number(item.price))
            });
          } else {
            salesMap.set(productName, {
              productName,
              quantity: item.quantity,
              revenue: item.quantity * Number(item.price),
              category
            });
          }
        });
      });

      const salesArray = Array.from(salesMap.values())
        .sort((a, b) => b.revenue - a.revenue);
      
      const dailySalesArray = Array.from(dailySalesMap.values())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const topProductsArray = salesArray.slice(0, 5).map(item => ({
        name: item.productName,
        totalSold: item.quantity,
        revenue: item.revenue,
        category: item.category
      }));

      setSalesData(salesArray);
      setDailySales(dailySalesArray);
      setTopProducts(topProductsArray);
      setTotalRevenue(revenue);
      setTotalOrders(orders);

    } catch (error: any) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować analityki sprzedaży",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Analityka sprzedaży
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Ładowanie danych sprzedaży...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with time range selector */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Analityka sprzedaży produktów
              </CardTitle>
              <CardDescription>
                Szczegółowe statystyki sprzedaży i popularności produktów
              </CardDescription>
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Ostatnie 7 dni</SelectItem>
                <SelectItem value="30">Ostatnie 30 dni</SelectItem>
                <SelectItem value="90">Ostatnie 3 miesiące</SelectItem>
                <SelectItem value="365">Ostatni rok</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Łączny przychód</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <ShoppingCart className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Liczba zamówień</p>
                <p className="text-2xl font-bold">{totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Produktów sprzedanych</p>
                <p className="text-2xl font-bold">
                  {salesData.reduce((sum, item) => sum + item.quantity, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Średnia na dzień</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalRevenue / parseInt(timeRange))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily sales chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sprzedaż dzienna</CardTitle>
            <CardDescription>Przychód z sprzedaży w czasie</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('pl-PL')}
                />
                <YAxis tickFormatter={(value) => `${value} zł`} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString('pl-PL')}
                  formatter={(value) => [`${value} zł`, 'Przychód']}
                />
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Product sales pie chart */}
        <Card>
          <CardHeader>
            <CardTitle>Udział w sprzedaży</CardTitle>
            <CardDescription>Top 5 produktów według przychodu</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={topProducts}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {topProducts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top products list */}
      <Card>
        <CardHeader>
          <CardTitle>Najpopularniejsze produkty</CardTitle>
          <CardDescription>Ranking według liczby sprzedanych sztuk</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={product.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                    <span className="text-sm font-bold text-primary">#{index + 1}</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">{product.name}</h4>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {product.category}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {product.totalSold} szt. sprzedanych
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(product.revenue)}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(product.revenue / product.totalSold)} za szt.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sales by category */}
      <Card>
        <CardHeader>
          <CardTitle>Sprzedaż według kategorii</CardTitle>
          <CardDescription>Porównanie wyników sprzedaży w kategoriach</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={salesData.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="productName" angle={-45} textAnchor="end" height={100} />
              <YAxis tickFormatter={(value) => `${value} zł`} />
              <Tooltip formatter={(value) => [`${value} zł`, 'Przychód']} />
              <Bar dataKey="revenue" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductSalesAnalytics;