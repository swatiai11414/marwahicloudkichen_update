import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  Building2,
  Users,
  ShoppingCart,
  TrendingUp,
  Plus,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Megaphone,
  Rocket,
  Mail,
  Share2,
  Star,
  Globe,
  Zap,
  Target,
  Eye
} from "lucide-react";
import { BulkAvailabilityManager } from "@/components/BulkAvailabilityManager";
import type { Shop } from "@/shared/schema";

interface SuperAdminStats {
  totalShops: number;
  activeShops: number;
  totalOrders: number;
  totalRevenue: number;
  recentShops: Shop[];
}

function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon 
}: { 
  title: string; 
  value: string | number; 
  description?: string; 
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
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

export default function SuperAdminDashboard() {
  const { data: stats, isLoading } = useQuery<SuperAdminStats>({
    queryKey: ["/api/super-admin/dashboard"],
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage all shops and platform settings
            </p>
          </div>
          <Button asChild data-testid="button-create-shop">
            <Link href="/super-admin/shops">
              <Plus className="mr-2 h-4 w-4" />
              Create Shop
            </Link>
          </Button>
        </div>

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
              title="Total Shops"
              value={stats?.totalShops || 0}
              icon={Building2}
            />
            <StatCard
              title="Active Shops"
              value={stats?.activeShops || 0}
              description={`${stats?.totalShops ? Math.round((stats.activeShops / stats.totalShops) * 100) : 0}% active`}
              icon={CheckCircle2}
            />
            <StatCard
              title="Total Orders"
              value={stats?.totalOrders || 0}
              description="All time"
              icon={ShoppingCart}
            />
            <StatCard
              title="Total Revenue"
              value={`₹${(stats?.totalRevenue || 0).toFixed(2)}`}
              description="Platform-wide"
              icon={TrendingUp}
            />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Recent Shops</CardTitle>
                <CardDescription>Latest shops on the platform</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/super-admin/shops" className="gap-1">
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
                      <Skeleton className="h-10 w-10 rounded" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats?.recentShops && stats.recentShops.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentShops.slice(0, 5).map((shop) => (
                    <div
                      key={shop.id}
                      className="flex items-center gap-4"
                      data-testid={`shop-row-${shop.id}`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                        {shop.logo ? (
                          <img src={shop.logo} alt="" className="h-full w-full rounded object-cover" />
                        ) : (
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{shop.shopName}</p>
                        <p className="text-sm text-muted-foreground">/s/{shop.slug}</p>
                      </div>
                      <Badge variant={shop.isActive ? "secondary" : "outline"}>
                        {shop.isActive ? (
                          <><CheckCircle2 className="mr-1 h-3 w-3" /> Active</>
                        ) : (
                          <><XCircle className="mr-1 h-3 w-3" /> Inactive</>
                        )}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Building2 className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground">No shops yet</p>
                  <Button variant="link" asChild>
                    <Link href="/super-admin/shops">Create your first shop</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button variant="outline" className="justify-start gap-2" asChild>
                <Link href="/super-admin/orders" data-testid="link-quick-orders">
                  <ShoppingCart className="h-4 w-4" />
                  View All Orders
                </Link>
              </Button>
              <Button variant="outline" className="justify-start gap-2" asChild>
                <Link href="/super-admin/themes" data-testid="link-quick-themes">
                  <Users className="h-4 w-4" />
                  Manage Themes
                </Link>
              </Button>
              <Button variant="outline" className="justify-start gap-2" asChild>
                <Link href="/super-admin/analytics" data-testid="link-quick-analytics">
                  <TrendingUp className="h-4 w-4" />
                  View Analytics
                </Link>
              </Button>
              <Button variant="outline" className="justify-start gap-2" asChild>
                <Link href="/super-admin/offers" data-testid="link-quick-offers">
                  <Megaphone className="h-4 w-4" />
                  Manage Offers
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Marketing Hub - marwahi.in */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Rocket className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Marketing Hub
                  <Badge variant="secondary" className="bg-primary/20 text-primary">marwahi.in</Badge>
                </CardTitle>
                <CardDescription>Boost your shops with powerful marketing tools</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Create Offer */}
              <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
                <CardContent className="flex flex-col items-center p-4 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                    <Megaphone className="h-6 w-6 text-green-500" />
                  </div>
                  <h3 className="font-semibold">Create Offer</h3>
                  <p className="text-xs text-muted-foreground">Launch promotions & discounts</p>
                </CardContent>
              </Card>

              {/* Email Campaign */}
              <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
                <CardContent className="flex flex-col items-center p-4 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                    <Mail className="h-6 w-6 text-blue-500" />
                  </div>
                  <h3 className="font-semibold">Email Campaign</h3>
                  <p className="text-xs text-muted-foreground">Reach customers via email</p>
                </CardContent>
              </Card>

              {/* Share Shop */}
              <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
                <CardContent className="flex flex-col items-center p-4 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
                    <Share2 className="h-6 w-6 text-purple-500" />
                  </div>
                  <h3 className="font-semibold">Share Shop</h3>
                  <p className="text-xs text-muted-foreground">Share on social media</p>
                </CardContent>
              </Card>

              {/* Customer Reviews */}
              <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
                <CardContent className="flex flex-col items-center p-4 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10">
                    <Star className="h-6 w-6 text-yellow-500" />
                  </div>
                  <h3 className="font-semibold">Reviews</h3>
                  <p className="text-xs text-muted-foreground">Build trust with reviews</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Preview */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                Shop Performance
              </CardTitle>
              <CardDescription>Track how customers engage with your shops</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <Globe className="mx-auto mb-2 h-8 w-8 text-primary" />
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-xs text-muted-foreground">Page Views</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <Target className="mx-auto mb-2 h-8 w-8 text-primary" />
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-xs text-muted-foreground">Conversions</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <Zap className="mx-auto mb-2 h-8 w-8 text-primary" />
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-xs text-muted-foreground">Engagement Rate</p>
                </div>
              </div>
              <div className="mt-4 text-center">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/super-admin/analytics">
                    View Detailed Analytics
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                What's New
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3 rounded-lg bg-green-50 p-3 dark:bg-green-950/30">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">New Theme Templates</p>
                  <p className="text-xs text-muted-foreground">3 new restaurant themes added</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Email Integration</p>
                  <p className="text-xs text-muted-foreground">Send promotions to customers</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-lg bg-purple-50 p-3 dark:bg-purple-950/30">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500 text-white">
                  <Share2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Social Sharing</p>
                  <p className="text-xs text-muted-foreground">Share shops on WhatsApp & more</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Availability Management */}
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Store Availability Management
            </CardTitle>
            <CardDescription>
              Set operating hours and holidays for all shops at once
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BulkAvailabilityManager />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
