import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Download, FileSpreadsheet, Store, Phone, User, ShoppingCart, AlertCircle, RefreshCw } from "lucide-react";
import type { Shop } from "@shared/schema";

interface AnalyticsOrder {
  id: string;
  shopName: string;
  shopPhone: string | null;
  customerName: string | null;
  customerPhone: string | null;
  orderNumber: string | null;
  items: { itemName: string; quantity: number; price: string }[];
  totalAmount: string;
  paymentMode: string | null;
  status: string;
  createdAt: string | null;
}

export default function SuperAdminAnalytics() {
  const [shopFilter, setShopFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { data: shops = [], isLoading: shopsLoading } = useQuery<Shop[]>({
    queryKey: ["/api/super-admin/shops"],
    retry: false,
  });

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (shopFilter && shopFilter !== "all") params.append("shopId", shopFilter);
    if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return params.toString();
  };

  const { data: orders = [], isLoading, error, refetch, isFetching } = useQuery<AnalyticsOrder[]>({
    queryKey: ["/api/super-admin/analytics/orders", shopFilter, statusFilter, startDate, endDate],
    queryFn: async () => {
      const queryString = buildQueryString();
      const response = await fetch(`/api/super-admin/analytics/orders${queryString ? `?${queryString}` : ""}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch analytics");
      }
      return response.json();
    },
    retry: false,
  });

  const handleExportCSV = () => {
    const queryString = buildQueryString();
    window.open(`/api/super-admin/analytics/export${queryString ? `?${queryString}` : ""}`, "_blank");
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_payment":
        return <Badge variant="secondary" data-testid="badge-pending">Pending</Badge>;
      case "paid":
        return <Badge className="bg-green-500" data-testid="badge-paid">Paid</Badge>;
      case "preparing":
        return <Badge className="bg-orange-500" data-testid="badge-preparing">Preparing</Badge>;
      case "ready":
        return <Badge className="bg-blue-500" data-testid="badge-ready">Ready</Badge>;
      case "completed":
        return <Badge className="bg-green-600" data-testid="badge-completed">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive" data-testid="badge-cancelled">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.totalAmount), 0) || 0;
  const totalOrders = orders?.length || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Analytics</h1>
            <p className="text-muted-foreground">
              View and export order data across all shops
            </p>
          </div>
          <Button size="lg" onClick={handleExportCSV} className="bg-green-600 hover:bg-green-700" data-testid="button-export-csv">
            <Download className="mr-2 h-5 w-5" />
            Download CSV
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-orders">{totalOrders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-revenue">₹{totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Shop</Label>
                <Select value={shopFilter} onValueChange={setShopFilter}>
                  <SelectTrigger data-testid="select-shop-filter">
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
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="select-status-filter">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending_payment">Pending Payment</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="preparing">Preparing</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="input-end-date"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg">Orders Data</CardTitle>
            <Button variant="outline" size="sm" onClick={handleExportCSV} data-testid="button-download-table">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="py-8 text-center" data-testid="text-error">
                <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
                <p className="text-destructive font-medium mb-4">
                  {error instanceof Error ? error.message : "Failed to load data"}
                </p>
                <div className="flex justify-center gap-4">
                  <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                    Retry
                  </Button>
                  <Button onClick={handleExportCSV} className="bg-green-600 hover:bg-green-700">
                    <Download className="mr-2 h-4 w-4" />
                    Download CSV Anyway
                  </Button>
                </div>
              </div>
            ) : Array.isArray(orders) && orders.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shop</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Order #</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Store className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium" data-testid={`text-shop-name-${order.id}`}>{order.shopName}</div>
                              {order.shopPhone && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Phone className="h-3 w-3" />
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
                              <div data-testid={`text-customer-name-${order.id}`}>{order.customerName || "-"}</div>
                              {order.customerPhone && (
                                <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-order-number-${order.id}`}>
                          {order.orderNumber || order.id.slice(-8).toUpperCase()}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate text-sm" data-testid={`text-items-${order.id}`}>
                            {order.items.map((i) => `${i.itemName} x${i.quantity}`).join(", ")}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium" data-testid={`text-amount-${order.id}`}>
                          ₹{Number(order.totalAmount).toFixed(2)}
                        </TableCell>
                        <TableCell data-testid={`text-payment-${order.id}`}>
                          {order.paymentMode || "-"}
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground" data-testid={`text-date-${order.id}`}>
                          {formatDate(order.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground" data-testid="text-no-orders">
                No orders found matching the filters
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
