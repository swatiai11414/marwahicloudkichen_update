import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { 
  ShoppingCart, 
  Utensils, 
  Users, 
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowRight,
  Banknote,
  CreditCard,
  Receipt,
  Timer,
  Star
} from "lucide-react";
import { StoreStatusToggle } from "@/components/StoreStatusToggle";
import type { Order, Shop } from "@shared/schema";

interface DashboardStats {
  todayOrders: number;
  totalRevenue: number;
  activeMenuItems: number;
  totalCustomers: number;
  recentOrders: Order[];
  shop: Shop | null;
}

interface TodayStats {
  totalOrders: number;
  totalRevenue: number;
  cashRevenue: number;
  upiRevenue: number;
  paidOrders: number;
  pendingOrders: number;
  uniqueCustomers: number;
  avgBillValue: number;
  topSellingItem: { name: string; count: number } | null;
  peakHour: { hour: string; count: number } | null;
  recentOrders: Order[];
}

function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon,
  highlight
}: { 
  title: string; 
  value: string | number; 
  description?: string; 
  icon: React.ElementType;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary/50 bg-primary/5" : ""}>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${highlight ? "bg-primary text-primary-foreground" : "bg-primary/10"}`}>
          <Icon className={`h-5 w-5 ${highlight ? "" : "text-primary"}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case "pending_payment":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
    case "paid":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "pending":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "confirmed":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "preparing":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
    case "ready":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "completed":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    case "cancelled":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "";
  }
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard"],
  });

  const { data: todayStats, isLoading: isTodayLoading } = useQuery<TodayStats>({
    queryKey: ["/api/admin/dashboard/today"],
    refetchInterval: 30000,
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your shop today.
          </p>
        </div>

        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-primary" />
              <CardTitle>Today's Performance</CardTitle>
            </div>
            <CardDescription>Real-time analytics for today</CardDescription>
          </CardHeader>
          <CardContent>
            {isTodayLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    title="Today's Orders"
                    value={todayStats?.totalOrders || 0}
                    icon={ShoppingCart}
                    highlight
                  />
                  <StatCard
                    title="Today's Revenue"
                    value={`₹${(todayStats?.totalRevenue || 0).toFixed(2)}`}
                    icon={TrendingUp}
                    highlight
                  />
                  <StatCard
                    title="Unique Customers"
                    value={todayStats?.uniqueCustomers || 0}
                    icon={Users}
                  />
                  <StatCard
                    title="Average Bill"
                    value={`₹${(todayStats?.avgBillValue || 0).toFixed(2)}`}
                    icon={Receipt}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Payment Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Banknote className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Cash</span>
                        </div>
                        <span className="font-medium">₹{(todayStats?.cashRevenue || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">UPI</span>
                        </div>
                        <span className="font-medium">₹{(todayStats?.upiRevenue || 0).toFixed(2)}</span>
                      </div>
                      {(todayStats?.totalRevenue || 0) > 0 && (
                        <div className="pt-2">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Cash</span>
                            <span>UPI</span>
                          </div>
                          <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="bg-green-600"
                              style={{
                                width: `${((todayStats?.cashRevenue || 0) / (todayStats?.totalRevenue || 1)) * 100}%`,
                              }}
                            />
                            <div
                              className="bg-blue-600"
                              style={{
                                width: `${((todayStats?.upiRevenue || 0) / (todayStats?.totalRevenue || 1)) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Order Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-green-500" />
                          <span className="text-sm">Paid</span>
                        </div>
                        <Badge variant="secondary">{todayStats?.paidOrders || 0}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-orange-500" />
                          <span className="text-sm">Pending Payment</span>
                        </div>
                        <Badge variant="secondary">{todayStats?.pendingOrders || 0}</Badge>
                      </div>
                      {(todayStats?.totalOrders || 0) > 0 && (
                        <div className="pt-2">
                          <Progress
                            value={((todayStats?.paidOrders || 0) / (todayStats?.totalOrders || 1)) * 100}
                            className="h-2"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {(((todayStats?.paidOrders || 0) / (todayStats?.totalOrders || 1)) * 100).toFixed(0)}% paid
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Highlights</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {todayStats?.topSellingItem ? (
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">Top Seller</p>
                            <p className="text-xs text-muted-foreground">
                              {todayStats.topSellingItem.name} ({todayStats.topSellingItem.count} orders)
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No orders yet today</p>
                      )}
                      {todayStats?.peakHour && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">Peak Hour</p>
                            <p className="text-xs text-muted-foreground">
                              {todayStats.peakHour.hour} ({todayStats.peakHour.count} orders)
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="All Time Orders"
              value={stats?.todayOrders || 0}
              icon={ShoppingCart}
            />
            <StatCard
              title="Total Revenue"
              value={`₹${(stats?.totalRevenue || 0).toFixed(2)}`}
              description="All time"
              icon={TrendingUp}
            />
            <StatCard
              title="Active Menu Items"
              value={stats?.activeMenuItems || 0}
              icon={Utensils}
            />
            <StatCard
              title="Total Customers"
              value={stats?.totalCustomers || 0}
              icon={Users}
            />
          </div>
        )}

        {/* Store Status Toggle */}
        <StoreStatusToggle />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Latest orders from your customers</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/orders" className="gap-1">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats?.recentOrders && stats.recentOrders.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentOrders.slice(0, 5).map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center gap-4"
                      data-testid={`order-row-${order.id}`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Order #{order.orderNumber || order.id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.tableQr ? `Table ${order.tableQr}` : "Takeaway"} •{" "}
                          ₹{Number(order.totalAmount).toFixed(2)}
                        </p>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status === "pending_payment" ? "Awaiting Payment" : order.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <ShoppingCart className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground">No orders yet</p>
                  <p className="text-sm text-muted-foreground">
                    Orders will appear here when customers place them
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks you might want to do</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button variant="outline" className="justify-start gap-2" asChild>
                <Link href="/admin/menu" data-testid="link-quick-menu">
                  <Utensils className="h-4 w-4" />
                  Add Menu Item
                </Link>
              </Button>
              <Button variant="outline" className="justify-start gap-2" asChild>
                <Link href="/admin/offers" data-testid="link-quick-offer">
                  <TrendingUp className="h-4 w-4" />
                  Create Offer
                </Link>
              </Button>
              <Button variant="outline" className="justify-start gap-2" asChild>
                <Link href="/admin/orders" data-testid="link-quick-orders">
                  <ShoppingCart className="h-4 w-4" />
                  View Orders
                </Link>
              </Button>
              <Button variant="outline" className="justify-start gap-2" asChild>
                <Link href="/admin/settings" data-testid="link-quick-settings">
                  <CheckCircle2 className="h-4 w-4" />
                  Shop Settings
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
