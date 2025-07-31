import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileDown, Search, Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreateVoucherDialog } from "./CreateVoucherDialog";
import { RedeemVoucherDialog } from "./RedeemVoucherDialog";
import { EditVoucherDialog } from "./EditVoucherDialog";

interface Voucher {
  id: string;
  code: string;
  voucher_type: string;
  service_id?: string;
  user_id?: string;
  purchaser_email?: string;
  purchaser_phone?: string;
  purchaser_name?: string;
  original_value?: number;
  remaining_value?: number;
  original_sessions: number;
  remaining_sessions: number;
  status: string;
  expires_at?: string;
  notes?: string;
  created_at: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
  };
  services?: {
    name: string;
  };
}

export function VouchersManager() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRedeemDialog, setShowRedeemDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadVouchers();
  }, []);

  const loadVouchers = async () => {
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select(`
          *,
          services(name),
          profiles(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVouchers(data as any || []);
    } catch (error) {
      console.error('Error loading vouchers:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować bonów",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemVoucher = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setShowRedeemDialog(true);
  };

  const handleEditVoucher = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setShowEditDialog(true);
  };

  const exportVouchersReport = async () => {
    try {
      const { data, error } = await supabase
        .from('voucher_redemptions')
        .select(`
          *,
          vouchers(code, voucher_type, original_value, original_sessions)
        `)
        .order('redemption_date', { ascending: false });

      if (error) throw error;

      // Create CSV content
      const csvHeaders = [
        'Data realizacji', 'Kod bonu', 'Typ', 'Wartość', 'Sesje', 
        'Realizujący', 'Notatki'
      ];
      
      const csvRows = data.map((redemption: any) => [
        new Date(redemption.redemption_date).toLocaleDateString('pl-PL'),
        redemption.vouchers?.code || '',
        redemption.vouchers?.voucher_type === 'single' ? 'Pojedynczy' : 'Pakiet',
        redemption.redeemed_value?.toString() || '',
        redemption.redeemed_sessions?.toString() || '',
        'Gość', // Simplified for now
        redemption.notes || ''
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `raport_bonow_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Sukces",
        description: "Raport został wygenerowany i pobrany",
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się wygenerować raportu",
        variant: "destructive",
      });
    }
  };

  const filteredVouchers = vouchers.filter(voucher => {
    const matchesSearch = searchTerm === "" || 
      voucher.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (voucher.purchaser_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (voucher.purchaser_email?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || voucher.status === statusFilter;
    const matchesType = typeFilter === "all" || voucher.voucher_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "default",
      redeemed: "secondary",
      expired: "destructive",
      cancelled: "outline"
    } as const;
    
    const labels = {
      active: "Aktywny",
      redeemed: "Zrealizowany",
      expired: "Przeterminowany",
      cancelled: "Anulowany"
    };

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const getVoucherOwner = (voucher: Voucher) => {
    if (voucher.profiles?.first_name && voucher.profiles?.last_name) {
      return `${voucher.profiles.first_name} ${voucher.profiles.last_name}`;
    }
    if (voucher.purchaser_name) {
      return voucher.purchaser_name;
    }
    return voucher.purchaser_email || 'Nieznany';
  };

  if (loading) {
    return <div>Ładowanie...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Zarządzanie bonami podarunkowymi</CardTitle>
          <CardDescription>
            Zarządzaj bonami podarunkowymi i pakietami masażu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj po kodzie, nazwie lub emailu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtruj po statusie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie statusy</SelectItem>
                <SelectItem value="active">Aktywne</SelectItem>
                <SelectItem value="redeemed">Zrealizowane</SelectItem>
                <SelectItem value="expired">Przeterminowane</SelectItem>
                <SelectItem value="cancelled">Anulowane</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtruj po typie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie typy</SelectItem>
                <SelectItem value="single">Pojedyncze</SelectItem>
                <SelectItem value="package">Pakiety</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Dodaj bon
            </Button>
            <Button variant="outline" onClick={exportVouchersReport}>
              <FileDown className="w-4 h-4 mr-2" />
              Eksportuj raport
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kod</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Właściciel</TableHead>
                  <TableHead>Usługa</TableHead>
                  <TableHead>Wartość/Sesje</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data utworzenia</TableHead>
                  <TableHead>Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVouchers.map((voucher) => (
                  <TableRow key={voucher.id}>
                    <TableCell className="font-mono">{voucher.code}</TableCell>
                    <TableCell>
                      {voucher.voucher_type === 'single' ? 'Pojedynczy' : 'Pakiet'}
                    </TableCell>
                    <TableCell>{getVoucherOwner(voucher)}</TableCell>
                    <TableCell>{voucher.services?.name || 'Wszystkie'}</TableCell>
                    <TableCell>
                      {voucher.voucher_type === 'single' 
                        ? `${voucher.remaining_value}/${voucher.original_value} zł`
                        : `${voucher.remaining_sessions}/${voucher.original_sessions} sesji`
                      }
                    </TableCell>
                    <TableCell>{getStatusBadge(voucher.status)}</TableCell>
                    <TableCell>
                      {new Date(voucher.created_at).toLocaleDateString('pl-PL')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditVoucher(voucher)}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edytuj
                        </Button>
                        {voucher.status === 'active' && voucher.remaining_sessions > 0 && (
                          <Button
                            size="sm"
                            onClick={() => handleRedeemVoucher(voucher)}
                          >
                            Realizuj
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredVouchers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Brak bonów spełniających kryteria wyszukiwania
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CreateVoucherDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={loadVouchers}
      />

      {selectedVoucher && (
        <RedeemVoucherDialog
          open={showRedeemDialog}
          onOpenChange={setShowRedeemDialog}
          voucher={selectedVoucher as any}
          onSuccess={loadVouchers}
        />
      )}

      {selectedVoucher && (
        <EditVoucherDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          voucher={selectedVoucher}
          onSuccess={loadVouchers}
        />
      )}
    </div>
  );
}