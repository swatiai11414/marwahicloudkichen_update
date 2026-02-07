import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageLoader } from "@/components/loading-spinner";
import { downloadBillPDF } from "@/lib/bill-generator";
import { getStoredCustomer } from "@/lib/device-info";
import { 
  ArrowLeft, 
  Download, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  CreditCard,
  Wallet,
  UtensilsCrossed,
  ShoppingBag,
  FileText,
  User
} from "lucide-react";
import type { Shop, ShopTheme, Order, OrderItem } from "@shared/schema";

interface ShopData {
  shop: Shop;
  theme: ShopTheme | null;
}

interface OrderWithItems extends Order {
  items: OrderItem[];
  canDownloadBill: boolean;
}

export default function MyOrdersPage() {
  const { slug } = useParams<{ slug: string }>();
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);

  const { data: shopData, isLoading: shopLoading } = useQuery<ShopData>({
    queryKey: ["/api/shops", slug],
    enabled: !!slug,
  });

  useEffect(() => {
    if (shopData?.shop?.id) {
      const storedCustomer = getStoredCustomer(shopData.shop.id);
      if (storedCustomer) {
        setCustomerPhone(storedCustomer.phone);
        setCustomerName(storedCustomer.name);
      }
    }
  }, [shopData?.shop?.id]);

  const { data: orders, isLoading: ordersLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/shops", slug, "my-orders", customerPhone],
    queryFn: async () => {
      if (!customerPhone) return [];
      const response = await fetch(`/api/shops/${slug}/my-orders?phone=${encodeURIComponent(customerPhone)}`);
      if (!response.ok) throw new Error("Failed to fetch orders");
      return response.json();
    },
    enabled: !!slug && !!customerPhone,
  });

  const handleDownloadBill = (order: OrderWithItems) => {
    if (!shopData?.shop) return;
    
    const billItems = order.items.map(item => ({
      name: item.itemName,
      quantity: item.quantity,
      price: Number(item.price)
    }));
    
    downloadBillPDF({
      shopName: shopData.shop.shopName,
      shopAddress: shopData.shop.address || "",
      shopPhone: shopData.shop.whatsappNumber || "",
      billNumber: order.billNumber || `ORD-${order.id.slice(-8)}`,
      orderNumber: order.id.slice(-8).toUpperCase(),
      date: new Date(order.createdAt!),
      customerName: customerName || "",
      customerPhone: customerPhone || "",
      items: billItems,
      subtotal: billItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
      discount: Number(order.discountAmount) || 0,
      total: Number(order.totalAmount),
      paymentMode: order.paymentMode || "cash",
      tableNumber: order.tableQr || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_payment":
        return <Badge variant="secondary" className="gap-1" data-testid="badge-status-pending"><Clock className="h-3 w-3" /> Awaiting Payment</Badge>;
      case "paid":
        return <Badge className="gap-1 bg-green-500" data-testid="badge-status-paid"><CheckCircle className="h-3 w-3" /> Paid</Badge>;
      case "preparing":
        return <Badge className="gap-1 bg-orange-500" data-testid="badge-status-preparing"><UtensilsCrossed className="h-3 w-3" /> Preparing</Badge>;
      case "ready":
        return <Badge className="gap-1 bg-blue-500" data-testid="badge-status-ready"><CheckCircle className="h-3 w-3" /> Ready</Badge>;
      case "completed":
        return <Badge className="gap-1 bg-green-600" data-testid="badge-status-completed"><CheckCircle className="h-3 w-3" /> Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="gap-1" data-testid="badge-status-cancelled"><AlertCircle className="h-3 w-3" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline" data-testid="badge-status-unknown">{status}</Badge>;
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (shopLoading) {
    return <PageLoader />;
  }

  if (!shopData?.shop) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Shop Not Found</h2>
            <p className="text-muted-foreground">The shop you're looking for doesn't exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!customerPhone) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background border-b">
          <div className="container mx-auto px-4 py-3 flex items-center gap-3">
            <Link href={`/s/${slug}`}>
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">{shopData.shop.shopName}</h1>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Login Required</h2>
              <p className="text-muted-foreground mb-4">Please login from the shop page to view your orders.</p>
              <Link href={`/s/${slug}`}>
                <Button data-testid="button-go-to-shop">Go to Shop</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={`/s/${slug}`}>
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">My Orders</h1>
            <p className="text-sm text-muted-foreground">{customerName} - {customerPhone}</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {ordersLoading ? (
          <div className="flex justify-center py-12">
            <PageLoader />
          </div>
        ) : orders && orders.length > 0 ? (
          <div className="space-y-4 max-w-2xl mx-auto">
            {orders.map((order) => (
              <Card key={order.id} data-testid={`card-order-${order.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-base">
                        {order.billNumber || `Order #${order.id.slice(-6)}`}
                      </CardTitle>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      {order.items.map((item: any, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-sm">
                          {item.image && (
                            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-border">
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
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{item.itemName} x{item.quantity}</span>
                          </div>
                          <span className="text-muted-foreground font-medium">₹{(Number(item.price) * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>₹{Number(order.totalAmount).toFixed(2)}</span>
                    </div>

                    {order.paymentMode && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {order.paymentMode === "cash" ? (
                          <><Wallet className="h-4 w-4" /> Cash Payment</>
                        ) : (
                          <><CreditCard className="h-4 w-4" /> UPI Payment</>
                        )}
                      </div>
                    )}

                    {order.tableQr && (
                      <p className="text-sm text-muted-foreground">
                        Table: {order.tableQr}
                      </p>
                    )}

                    {order.canDownloadBill && (
                      <Button 
                        variant="outline" 
                        className="w-full gap-2 mt-2"
                        onClick={() => handleDownloadBill(order)}
                        data-testid={`button-download-bill-${order.id}`}
                      >
                        <Download className="h-4 w-4" />
                        Download Bill
                      </Button>
                    )}

                    {order.status === "pending_payment" && (
                      <div className="bg-muted p-3 rounded-md text-sm text-center">
                        <Clock className="h-4 w-4 inline mr-2" />
                        Bill will be available after payment confirmation
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Orders Yet</h2>
              <p className="text-muted-foreground mb-4">You haven't placed any orders at this shop.</p>
              <Link href={`/s/${slug}`}>
                <Button data-testid="button-start-ordering">Start Ordering</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
