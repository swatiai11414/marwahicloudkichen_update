import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Clock, CheckCircle2, Package, XCircle, RefreshCw, CreditCard, Banknote, Receipt, Download } from "lucide-react";
import type { Order } from "@shared/schema";

interface OrderWithItems extends Order {
  items: Array<{
    id: string;
    itemName: string;
    quantity: number;
    price: string;
  }>;
  customer?: {
    name: string;
    phone: string;
  };
}

const ORDER_STATUSES = [
  { value: "pending_payment", label: "Pending Payment", icon: Clock, color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "paid", label: "Paid", icon: CreditCard, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "pending", label: "Pending", icon: Clock, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  { value: "confirmed", label: "Confirmed", icon: CheckCircle2, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "preparing", label: "Preparing", icon: RefreshCw, color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  { value: "ready", label: "Ready", icon: Package, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  { value: "completed", label: "Completed", icon: CheckCircle2, color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
  { value: "cancelled", label: "Cancelled", icon: XCircle, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
];

export default function AdminOrders() {
  const { toast } = useToast();
  const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; order: OrderWithItems | null }>({ open: false, order: null });
  const [paymentMode, setPaymentMode] = useState<"cash" | "upi">("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [deliveryCharge, setDeliveryCharge] = useState("");

  const { data: orders, isLoading, refetch } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/admin/orders"],
    refetchInterval: 30000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/admin/orders/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({ title: "Order status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: ({ id, paymentMode, paymentReference, deliveryCharge }: { id: string; paymentMode: string; paymentReference?: string; deliveryCharge?: number }) =>
      apiRequest("POST", `/api/admin/orders/${id}/verify-payment`, { paymentMode, paymentReference, deliveryCharge }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      setPaymentDialog({ open: false, order: null });
      setPaymentMode("cash");
      setPaymentReference("");
      setDeliveryCharge("");
      toast({ title: "Payment verified successfully" });
    },
    onError: () => {
      toast({ title: "Failed to verify payment", variant: "destructive" });
    },
  });

  const handleVerifyPayment = () => {
    if (!paymentDialog.order) return;
    const deliveryChargeNum = deliveryCharge ? parseFloat(deliveryCharge) : undefined;
    verifyPaymentMutation.mutate({
      id: paymentDialog.order.id,
      paymentMode,
      paymentReference: paymentReference || undefined,
      deliveryCharge: deliveryChargeNum && !isNaN(deliveryChargeNum) ? deliveryChargeNum : undefined,
    });
  };

  const getStatusInfo = (status: string) =>
    ORDER_STATUSES.find((s) => s.value === status) || ORDER_STATUSES[0];

  const filterOrdersByStatus = (status: string | "all") =>
    status === "all"
      ? orders || []
      : orders?.filter((o) => o.status === status) || [];

  const formatTime = (date: Date | string | null) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const pendingPaymentCount = orders?.filter(o => o.status === "pending_payment").length || 0;
  const paidCount = orders?.filter(o => o.status === "paid").length || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Orders</h1>
            <p className="text-muted-foreground">
              Manage incoming orders and verify payments
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh-orders">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {pendingPaymentCount > 0 && (
          <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white">
                <Receipt className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{pendingPaymentCount} orders awaiting payment</p>
                <p className="text-sm text-muted-foreground">Verify payments to process orders</p>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Tabs defaultValue="pending_payment">
            <TabsList className="mb-4 flex-wrap">
              <TabsTrigger value="pending_payment" className="gap-1">
                Pending Payment
                {pendingPaymentCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                    {pendingPaymentCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="paid">
                Paid ({paidCount})
              </TabsTrigger>
              <TabsTrigger value="all">
                All ({orders?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({filterOrdersByStatus("completed").length})
              </TabsTrigger>
            </TabsList>

            {["pending_payment", "paid", "all", "completed"].map((tab) => (
              <TabsContent key={tab} value={tab}>
                <div className="space-y-4">
                  {filterOrdersByStatus(tab).length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <Package className="mb-4 h-12 w-12 text-muted-foreground" />
                        <h3 className="text-lg font-medium">No orders</h3>
                        <p className="text-sm text-muted-foreground">
                          {tab === "pending_payment"
                            ? "No orders awaiting payment verification"
                            : tab === "paid"
                            ? "No paid orders ready to prepare"
                            : tab === "all"
                            ? "No orders have been placed yet"
                            : `No ${tab} orders at the moment`}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    filterOrdersByStatus(tab).map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onUpdateStatus={(status) =>
                          updateStatusMutation.mutate({ id: order.id, status })
                        }
                        onVerifyPayment={() => setPaymentDialog({ open: true, order })}
                        getStatusInfo={getStatusInfo}
                        formatTime={formatTime}
                        formatDate={formatDate}
                      />
                    ))
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>

      <Dialog open={paymentDialog.open} onOpenChange={(open) => setPaymentDialog({ open, order: open ? paymentDialog.order : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Payment</DialogTitle>
            <DialogDescription>
              Confirm the payment method and mark this order as paid.
            </DialogDescription>
          </DialogHeader>

          {paymentDialog.order && (
            <div className="space-y-4 py-4">
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Order Total</p>
                      <p className="text-2xl font-bold">₹{Number(paymentDialog.order.totalAmount).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Customer</p>
                      <p className="font-medium">{paymentDialog.order.customer?.name || "Guest"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <RadioGroup value={paymentMode} onValueChange={(v) => setPaymentMode(v as "cash" | "upi")} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer">
                      <Banknote className="h-4 w-4" />
                      Cash
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="upi" id="upi" />
                    <Label htmlFor="upi" className="flex items-center gap-2 cursor-pointer">
                      <CreditCard className="h-4 w-4" />
                      UPI
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {paymentMode === "upi" && (
                <div className="space-y-2">
                  <Label htmlFor="paymentRef">UPI Transaction ID (Optional)</Label>
                  <Input
                    id="paymentRef"
                    placeholder="Enter UPI transaction reference"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    data-testid="input-payment-reference"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="deliveryCharge">Delivery Charge (Optional)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <Input
                    id="deliveryCharge"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={deliveryCharge}
                    onChange={(e) => setDeliveryCharge(e.target.value)}
                    className="pl-7"
                    data-testid="input-delivery-charge"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Add delivery charge if applicable. This will be added to the order total.</p>
              </div>

              {deliveryCharge && parseFloat(deliveryCharge) > 0 && paymentDialog.order && (
                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <CardContent className="p-3">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>₹{Number(paymentDialog.order.subtotal).toFixed(2)}</span>
                    </div>
                    {Number(paymentDialog.order.discountAmount) > 0 && (
                      <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                        <span>Discount:</span>
                        <span>-₹{Number(paymentDialog.order.discountAmount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span>Delivery:</span>
                      <span>+₹{parseFloat(deliveryCharge).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-1 border-t mt-1">
                      <span>New Total:</span>
                      <span>₹{(Number(paymentDialog.order.subtotal) - Number(paymentDialog.order.discountAmount || 0) + parseFloat(deliveryCharge)).toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog({ open: false, order: null })}>
              Cancel
            </Button>
            <Button
              onClick={handleVerifyPayment}
              disabled={verifyPaymentMutation.isPending}
              data-testid="button-confirm-payment"
            >
              {verifyPaymentMutation.isPending ? "Verifying..." : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function OrderCard({
  order,
  onUpdateStatus,
  onVerifyPayment,
  getStatusInfo,
  formatTime,
  formatDate,
}: {
  order: OrderWithItems;
  onUpdateStatus: (status: string) => void;
  onVerifyPayment: () => void;
  getStatusInfo: (status: string) => typeof ORDER_STATUSES[0];
  formatTime: (date: Date | string | null) => string;
  formatDate: (date: Date | string | null) => string;
}) {
  const statusInfo = getStatusInfo(order.status);
  const StatusIcon = statusInfo.icon;
  const isPendingPayment = order.status === "pending_payment";

  return (
    <Card data-testid={`order-card-${order.id}`} className={isPendingPayment ? "border-orange-200 dark:border-orange-900" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <span>Order #{order.orderNumber || order.id.slice(0, 8)}</span>
              {order.tableQr && (
                <Badge variant="outline">Table {order.tableQr}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {formatDate(order.createdAt)} at {formatTime(order.createdAt)}
              {order.customer && (
                <> • {order.customer.name} ({order.customer.phone})</>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusInfo.color}>
              <StatusIcon className="mr-1 h-3 w-3" />
              {statusInfo.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="rounded-lg bg-muted/50 p-3">
            {order.items.map((item: any, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                {item.image && (
                  <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-border">
                    <img 
                      src={item.image} 
                      alt={item.itemName} 
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <span className="text-sm flex-1">
                  {item.quantity}x {item.itemName}
                </span>
                <span className="text-sm font-medium">
                  ₹{(Number(item.price) * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
            {Number(order.deliveryCharge || 0) > 0 && (
              <div className="flex items-center justify-between border-t border-border pt-2 mt-2 text-sm">
                <span>Subtotal</span>
                <span>₹{Number(order.subtotal).toFixed(2)}</span>
              </div>
            )}
            {Number(order.discountAmount || 0) > 0 && (
              <div className="flex items-center justify-between text-sm text-green-600 dark:text-green-400">
                <span>Discount</span>
                <span>-₹{Number(order.discountAmount).toFixed(2)}</span>
              </div>
            )}
            {Number(order.deliveryCharge || 0) > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span>Delivery</span>
                <span>+₹{Number(order.deliveryCharge).toFixed(2)}</span>
              </div>
            )}
            <div className={`flex items-center justify-between ${Number(order.deliveryCharge || 0) > 0 ? '' : 'border-t border-border mt-2'} pt-2`}>
              <span className="font-medium">Total</span>
              <span className="font-bold">₹{Number(order.totalAmount).toFixed(2)}</span>
            </div>
          </div>

          {order.notes && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Notes:</span> {order.notes}
            </p>
          )}

          {order.billNumber && (
            <div className="flex items-center gap-2 text-sm">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <span>Bill: {order.billNumber}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {order.paymentMode && (
                <Badge variant="secondary" className="gap-1">
                  {order.paymentMode === "cash" ? <Banknote className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                  {order.paymentMode.toUpperCase()}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isPendingPayment ? (
                <Button onClick={onVerifyPayment} size="sm" data-testid={`button-verify-${order.id}`}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Verify Payment
                </Button>
              ) : (
                <>
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Select
                    value={order.status}
                    onValueChange={onUpdateStatus}
                  >
                    <SelectTrigger className="w-32" data-testid={`select-status-${order.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUSES.filter(s => s.value !== "pending_payment").map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
