import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, Store, Phone, User, ShoppingCart, Clock, CreditCard, Banknote, AlertCircle, Printer } from "lucide-react";
import { downloadBillPDF, downloadBillAsHTML } from "@/lib/bill-generator";
import type { Shop } from "@shared/schema";

interface OrderData {
  id: string;
  shopId: string;
  shopName: string;
  shopLogo: string | null;
  shopPhone: string | null;
  shopAddress: string | null;
  shopUpiId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  deliveryAddress: string | null;
  orderNumber: string | null;
  billNumber: string | null;
  items: { itemName: string; quantity: number; price: string }[];
  subtotal: string;
  discountAmount: string | null;
  deliveryCharge: string | null;
  totalAmount: string;
  paymentMode: string | null;
  status: string;
  notes: string | null;
  createdAt: string | null;
}

const ORDER_STATUSES = [
  { value: "all", label: "All Statuses" },
  { value: "pending_payment", label: "Pending Payment" },
  { value: "paid", label: "Paid" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function SuperAdminOrders() {
  const [shopFilter, setShopFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: shopsData } = useQuery<{ shops: Shop[]; themes: any[] }>({
    queryKey: ["/api/super-admin/shops"],
    retry: false,
  });
  const shops = shopsData?.shops || [];

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (shopFilter && shopFilter !== "all") params.append("shopId", shopFilter);
    if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
    return params.toString();
  };

  const { data: orders = [], isLoading, error, refetch, isFetching } = useQuery<OrderData[]>({
    queryKey: ["/api/super-admin/analytics/orders", shopFilter, statusFilter],
    queryFn: async () => {
      const queryString = buildQueryString();
      const response = await fetch(`/api/super-admin/analytics/orders${queryString ? `?${queryString}` : ""}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch orders");
      }
      return response.json();
    },
    refetchInterval: 10000,
    retry: false,
  });

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_payment":
        return <Badge className="bg-orange-500 text-white" data-testid="badge-pending">Pending Payment</Badge>;
      case "paid":
        return <Badge className="bg-blue-500 text-white" data-testid="badge-paid">Paid</Badge>;
      case "preparing":
        return <Badge className="bg-purple-500 text-white" data-testid="badge-preparing">Preparing</Badge>;
      case "ready":
        return <Badge className="bg-green-500 text-white" data-testid="badge-ready">Ready</Badge>;
      case "completed":
        return <Badge className="bg-gray-500 text-white" data-testid="badge-completed">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive" data-testid="badge-cancelled">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = orders?.filter(o => o.status === "pending_payment").length || 0;
  const paidCount = orders?.filter(o => o.status === "paid").length || 0;
  const totalOrders = orders?.length || 0;
  const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.totalAmount), 0) || 0;

  const handlePrintBill = async (order: OrderData) => {
    try {
      console.log("Printing bill for order:", order.id, "shopId:", order.shopId);

      // Prepare bill data using data already available in order
      const billItems = order.items.map(item => ({
        name: item.itemName,
        quantity: item.quantity,
        price: Number(item.price),
      }));

      const subtotal = Number(order.subtotal);
      const deliveryCharge = Number(order.deliveryCharge || 0);
      const discount = Number(order.discountAmount || 0);

      console.log("Bill data prepared, calling downloadBillPDF");

      try {
        downloadBillPDF({
          shopName: order.shopName,
          shopLogo: order.shopLogo || undefined,
          shopAddress: order.shopAddress || undefined,
          shopPhone: order.shopPhone || undefined,
          billNumber: order.billNumber || `ORD-${order.orderNumber || order.id.slice(-8)}`,
          orderNumber: order.orderNumber || order.id.slice(-8).toUpperCase(),
          date: new Date(order.createdAt || Date.now()),
          customerName: order.customerName || "Guest",
          customerPhone: order.customerPhone || undefined,
          customerAddress: order.deliveryAddress || undefined,
          tableNumber: undefined,
          items: billItems,
          subtotal: subtotal,
          deliveryCharge: deliveryCharge > 0 ? deliveryCharge : undefined,
          discount: discount > 0 ? discount : undefined,
          total: Number(order.totalAmount),
          paymentMode: order.paymentMode || "cash",
          upiId: order.shopUpiId || undefined,
        });
        console.log("Bill print initiated");
      } catch (printError) {
        console.log("Print failed, trying HTML download", printError);
        downloadBillAsHTML({
          shopName: order.shopName,
          shopLogo: order.shopLogo || undefined,
          shopAddress: order.shopAddress || undefined,
          shopPhone: order.shopPhone || undefined,
          billNumber: order.billNumber || `ORD-${order.orderNumber || order.id.slice(-8)}`,
          orderNumber: order.orderNumber || order.id.slice(-8).toUpperCase(),
          date: new Date(order.createdAt || Date.now()),
          customerName: order.customerName || "Guest",
          customerPhone: order.customerPhone || undefined,
          customerAddress: order.deliveryAddress || undefined,
          tableNumber: undefined,
          items: billItems,
          subtotal: subtotal,
          deliveryCharge: deliveryCharge > 0 ? deliveryCharge : undefined,
          discount: discount > 0 ? discount : undefined,
          total: Number(order.totalAmount),
          paymentMode: order.paymentMode || "cash",
          upiId: order.shopUpiId || undefined,
        });
        console.log("Bill HTML download initiated");
        alert("Print dialog blocked. Bill downloaded as HTML file instead.");
      }
    } catch (error) {
      console.error("Error printing bill:", error);
      alert(`Error printing bill: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">All Orders</h1>
            <p className="text-muted-foreground">
              Real-time view of orders from all shops
            </p>
          </div>
          <Button 
            onClick={() => refetch()} 
            disabled={isFetching}
            data-testid="button-refresh"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-orders">{totalOrders}</div>
            </CardContent>
          </Card>
          <Card className="border-orange-200 dark:border-orange-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payment</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600" data-testid="stat-pending">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 dark:border-blue-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Today</CardTitle>
              <CreditCard className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600" data-testid="stat-paid">{paidCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <Banknote className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="stat-revenue">₹{totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="min-w-[180px]">
                <Select value={shopFilter} onValueChange={setShopFilter}>
                  <SelectTrigger data-testid="select-shop-filter">
                    <Store className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="All Shops" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shops</SelectItem>
                    {Array.isArray(shops) && shops.map((shop) => (
                      <SelectItem key={shop.id} value={shop.id}>
                        {shop.shopName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[180px]">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="select-status-filter">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="py-8 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
              <p className="text-red-600 dark:text-red-400">
                {error instanceof Error ? error.message : "Failed to load orders"}
              </p>
              <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardContent className="py-8">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Orders Table */}
        {!isLoading && !error && Array.isArray(orders) && orders.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Order</TableHead>
                      <TableHead className="min-w-[140px]">Shop</TableHead>
                      <TableHead className="min-w-[150px]">Customer</TableHead>
                      <TableHead className="min-w-[200px]">Items</TableHead>
                      <TableHead className="text-right min-w-[100px]">Amount</TableHead>
                      <TableHead className="min-w-[100px]">Payment</TableHead>
                      <TableHead className="min-w-[120px]">Status</TableHead>
                      <TableHead className="min-w-[100px]">Time</TableHead>
                      <TableHead className="min-w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                          <TableCell>
                            <div className="font-medium">
                              #{order.orderNumber || order.id.slice(0, 8)}
                            </div>
                            {order.billNumber && (
                              <div className="text-xs text-muted-foreground">
                                {order.billNumber}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Store className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{order.shopName}</div>
                                {order.shopPhone && (
                                  <div className="text-xs text-muted-foreground">
                                    {order.shopPhone}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div>{order.customerName || "Guest"}</div>
                                {order.customerPhone && (
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {order.customerPhone}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {order.items.slice(0, 2).map((item, i) => (
                                <div key={i} className="truncate max-w-[200px]">
                                  {item.quantity}x {item.itemName}
                                </div>
                              ))}
                              {order.items.length > 2 && (
                                <div className="text-muted-foreground">
                                  +{order.items.length - 2} more
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-bold">₹{Number(order.totalAmount).toFixed(2)}</div>
                            {Number(order.deliveryCharge || 0) > 0 && (
                              <div className="text-xs text-muted-foreground">
                                +₹{Number(order.deliveryCharge).toFixed(2)} delivery
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {order.paymentMode ? (
                              <Badge variant="outline" className="gap-1">
                                {order.paymentMode === "cash" ? (
                                  <Banknote className="h-3 w-3" />
                                ) : (
                                  <CreditCard className="h-3 w-3" />
                                )}
                                {order.paymentMode.toUpperCase()}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(order.status)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{formatTime(order.createdAt)}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatDate(order.createdAt)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePrintBill(order)}
                              className="gap-1"
                              data-testid={`button-print-bill-${order.id}`}
                            >
                              <Printer className="h-3 w-3" />
                              Print Bill
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && (!Array.isArray(orders) || orders.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingCart className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-muted-foreground">No orders found</p>
            </CardContent>
          </Card>
        )}

        {/* Auto-refresh indicator */}
        <div className="text-center text-sm text-muted-foreground">
          <Clock className="inline-block h-4 w-4 mr-1" />
          Auto-refreshing every 10 seconds
        </div>
      </div>
    </AdminLayout>
  );
}
