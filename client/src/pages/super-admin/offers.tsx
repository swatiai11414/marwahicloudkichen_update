import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Gift,
  Calendar,
  Percent,
  DollarSign,
  Building2,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface Offer {
  id: string;
  shopId: string;
  title: string;
  description: string | null;
  discountType: string;
  discountValue: string;
  minVisits: number;
  minOrderAmount: string | null;
  expiryDate: Date | null;
  isActive: boolean;
  createdAt: Date;
  shopName?: string;
  shopSlug?: string;
}

interface Shop {
  id: string;
  shopName: string;
  slug: string;
}

interface OfferStats {
  totalOffers: number;
  activeOffers: number;
  expiringSoon: number;
  expiredOffers: number;
}

export default function SuperAdminOffers() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [search, setSearch] = useState("");
  const [shopFilter, setShopFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedShopId, setSelectedShopId] = useState<string>("");

  // Fetch shops for dropdown
  const { data: shopsData } = useQuery<{ shops: Shop[] }>({
    queryKey: ["/api/super-admin/shops"],
  });

  // Fetch offers with filters
  const { data: offers, isLoading } = useQuery<Offer[]>({
    queryKey: ["/api/super-admin/offers", shopFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (shopFilter !== "all") params.set("shopId", shopFilter);
      if (statusFilter !== "all") params.set("isActive", statusFilter === "active" ? "true" : "false");
      const response = await fetch(`/api/super-admin/offers?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch offers");
      return response.json();
    },
  });

  // Fetch stats
  const { data: stats } = useQuery<OfferStats>({
    queryKey: ["/api/super-admin/offers/stats"],
  });

  // Filter offers by search
  const filteredOffers = offers?.filter((offer) => {
    if (!search.trim()) return true;
    const searchLower = search.toLowerCase();
    return (
      offer.title.toLowerCase().includes(searchLower) ||
      (offer.shopName?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  const createMutation = useMutation({
    mutationFn: (offerData: { shopId: string; title: string; description?: string; discountType: string; discountValue: string; minVisits?: number; minOrderAmount?: string; expiryDate?: string; isActive?: boolean }) =>
      apiRequest("POST", `/api/super-admin/shops/${offerData.shopId}/offers`, offerData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/offers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/offers/stats"] });
      setDialogOpen(false);
      setEditingOffer(null);
      toast({ title: "Offer created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create offer", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Offer> }) =>
      apiRequest("PATCH", `/api/super-admin/offers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/offers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/offers/stats"] });
      setDialogOpen(false);
      setEditingOffer(null);
      toast({ title: "Offer updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update offer", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/super-admin/offers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/offers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/offers/stats"] });
      toast({ title: "Offer deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete offer", description: error.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/super-admin/offers/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/offers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/offers/stats"] });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const offerData = {
      shopId: editingOffer?.shopId || selectedShopId,
      title: formData.get("title") as string,
      description: formData.get("description") as string || undefined,
      discountType: formData.get("discountType") as string,
      discountValue: formData.get("discountValue") as string,
      minVisits: parseInt(formData.get("minVisits") as string) || 0,
      minOrderAmount: formData.get("minOrderAmount") as string || undefined,
      expiryDate: formData.get("expiryDate")
        ? new Date(formData.get("expiryDate") as string)
        : undefined,
      isActive: formData.get("isActive") === "on",
    };

    if (!offerData.shopId) {
      toast({ title: "Please select a shop", variant: "destructive" });
      return;
    }

    if (editingOffer) {
      updateMutation.mutate({ id: editingOffer.id, data: offerData });
    } else {
      createMutation.mutate(offerData);
    }
  };

  const openDialog = (offer: Offer | null, shopId?: string) => {
    setEditingOffer(offer);
    if (offer) {
      setSelectedShopId(offer.shopId);
    } else if (shopId) {
      setSelectedShopId(shopId);
    }
    setDialogOpen(true);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "No expiry";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isExpired = (date: Date | string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const isExpiringSoon = (date: Date | string | null) => {
    if (!date) return false;
    const expiry = new Date(date);
    const now = new Date();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return expiry > now && expiry.getTime() - now.getTime() < sevenDays;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Offers Management</h1>
            <p className="text-muted-foreground">
              Manage promotional offers across all shops
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog(null)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Offer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingOffer ? "Edit Offer" : "Create New Offer"}
                </DialogTitle>
                <DialogDescription>
                  Set up a promotional offer for a shop
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="max-h-[60vh] space-y-4 overflow-y-auto py-4">
                  {!editingOffer && (
                    <div className="space-y-2">
                      <Label htmlFor="shopId">Shop</Label>
                      <Select value={selectedShopId} onValueChange={setSelectedShopId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a shop" />
                        </SelectTrigger>
                        <SelectContent>
                          {shopsData?.shops.map((shop) => (
                            <SelectItem key={shop.id} value={shop.id}>
                              {shop.shopName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {editingOffer && (
                    <div className="flex items-center gap-2 rounded-md bg-muted p-3">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{editingOffer.shopName}</span>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="title">Offer Title</Label>
                    <Input
                      id="title"
                      name="title"
                      defaultValue={editingOffer?.title || ""}
                      placeholder="e.g., Weekend Special"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={editingOffer?.description || ""}
                      placeholder="Describe your offer"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="discountType">Discount Type</Label>
                      <Select
                        name="discountType"
                        defaultValue={editingOffer?.discountType || "percentage"}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="discountValue">Discount Value</Label>
                      <Input
                        id="discountValue"
                        name="discountValue"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={editingOffer?.discountValue || ""}
                        placeholder="10"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minVisits">Min. Visits Required</Label>
                      <Input
                        id="minVisits"
                        name="minVisits"
                        type="number"
                        min="0"
                        defaultValue={editingOffer?.minVisits || "0"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minOrderAmount">Min. Order Amount</Label>
                      <Input
                        id="minOrderAmount"
                        name="minOrderAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={editingOffer?.minOrderAmount || ""}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input
                      id="expiryDate"
                      name="expiryDate"
                      type="date"
                      defaultValue={
                        editingOffer?.expiryDate
                          ? new Date(editingOffer.expiryDate).toISOString().split("T")[0]
                          : ""
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="isActive"
                      name="isActive"
                      defaultChecked={editingOffer?.isActive ?? true}
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingOffer ? "Update" : "Create"} Offer
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Offers</CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Gift className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalOffers || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Offers</CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10">
                <Gift className="h-5 w-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeOffers || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Expiring Soon</CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-500/10">
                <Calendar className="h-5 w-5 text-yellow-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.expiringSoon || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Expired</CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
                <Calendar className="h-5 w-5 text-red-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.expiredOffers || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search offers..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={shopFilter} onValueChange={setShopFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Shops" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Shops</SelectItem>
              {shopsData?.shops.map((shop) => (
                <SelectItem key={shop.id} value={shop.id}>
                  {shop.shopName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredOffers && filteredOffers.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredOffers.map((offer) => (
              <Card
                key={offer.id}
                className={
                  !offer.isActive || isExpired(offer.expiryDate)
                    ? "opacity-60"
                    : ""
                }
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        {offer.discountType === "percentage" ? (
                          <Percent className="h-5 w-5 text-primary" />
                        ) : (
                          <DollarSign className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base">{offer.title}</CardTitle>
                        <CardDescription>
                          {offer.discountType === "percentage"
                            ? `${offer.discountValue}% off`
                            : `₹${offer.discountValue} off`}
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={offer.isActive ?? false}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({
                          id: offer.id,
                          isActive: checked,
                        })
                      }
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Shop Name */}
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{offer.shopName}</span>
                    <a
                      href={`/s/${offer.shopSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-muted-foreground hover:text-primary"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>

                  {offer.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {offer.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {offer.minVisits ? (
                      <Badge variant="outline">Min {offer.minVisits} visits</Badge>
                    ) : null}
                    {offer.minOrderAmount && (
                      <Badge variant="outline">
                        Min ₹{offer.minOrderAmount}
                      </Badge>
                    )}
                    <Badge
                      variant={
                        isExpired(offer.expiryDate)
                          ? "destructive"
                          : isExpiringSoon(offer.expiryDate)
                          ? "default"
                          : "secondary"
                      }
                      className="flex items-center gap-1"
                    >
                      <Calendar className="h-3 w-3" />
                      {formatDate(offer.expiryDate)}
                    </Badge>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDialog(offer)}
                    >
                      <Pencil className="mr-1 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(offer.id)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Gift className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">No offers found</h3>
              <p className="text-sm text-muted-foreground">
                {search || shopFilter !== "all" || statusFilter !== "all"
                  ? "No offers match your filters"
                  : "Create your first offer to get started"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}