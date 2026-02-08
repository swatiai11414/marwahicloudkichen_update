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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, Building2, ExternalLink, Search, CheckCircle2, XCircle, Copy, UserCog, Clock, Calendar } from "lucide-react";
import { StoreAvailabilitySettings } from "@/components/StoreAvailabilitySettings";
import { HolidayManager } from "@/components/HolidayManager";
import type { Shop, ShopTheme, StoreAvailability, StoreHoliday } from "@shared/schema";
import type { AvailabilityFormData } from "@/components/StoreAvailabilitySettings";

interface ShopsData {
  shops: Shop[];
  themes: ShopTheme[];
}

interface AvailabilityData {
  availability: StoreAvailability | null;
  holidays: StoreHoliday[];
}

export default function SuperAdminShops() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [search, setSearch] = useState("");
  const [selectedThemeId, setSelectedThemeId] = useState<string>("");
  const [availabilityDialogOpen, setAvailabilityDialogOpen] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [selectedShopName, setSelectedShopName] = useState<string>("");

  // Get base URL for shop admin links
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const openDialog = (shop: Shop | null) => {
    setEditingShop(shop);
    setSelectedThemeId(shop?.themeId || "");
    setDialogOpen(true);
  };

  const openAvailabilityDialog = (shop: Shop) => {
    setSelectedShopId(shop.id);
    setSelectedShopName(shop.shopName);
    setAvailabilityDialogOpen(true);
  };

  const { data, isLoading } = useQuery<ShopsData>({
    queryKey: ["/api/super-admin/shops"],
  });

  // Fetch availability data for the selected shop
  const { data: availabilityData, refetch: refetchAvailability } = useQuery<AvailabilityData>({
    queryKey: [`/api/super-admin/shops/${selectedShopId}/availability`],
    enabled: !!selectedShopId && availabilityDialogOpen,
  });

  const createMutation = useMutation({
    mutationFn: (shopData: Partial<Shop>) =>
      apiRequest("POST", "/api/super-admin/shops", shopData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/shops"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/dashboard"] });
      setDialogOpen(false);
      setEditingShop(null);
      toast({ title: "Shop created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create shop", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Shop> }) =>
      apiRequest("PATCH", `/api/super-admin/shops/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/shops"] });
      setDialogOpen(false);
      setEditingShop(null);
      toast({ title: "Shop updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update shop", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/super-admin/shops/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/shops"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/dashboard"] });
      toast({ title: "Shop deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete shop", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/super-admin/shops/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/shops"] });
    },
  });

  const saveAvailabilityMutation = useMutation({
    mutationFn: async (availabilityData: AvailabilityFormData) =>
      apiRequest("PUT", `/api/super-admin/shops/${selectedShopId}/availability`, availabilityData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/super-admin/shops/${selectedShopId}/availability`] });
      toast({ title: "Availability settings saved successfully" });
      setAvailabilityDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to save availability settings", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const shopData = {
      shopName: formData.get("shopName") as string,
      slug: formData.get("slug") as string,
      logo: formData.get("logo") as string || undefined,
      banner: formData.get("banner") as string || undefined,
      whatsappNumber: formData.get("whatsappNumber") as string || undefined,
      adminPassword: formData.get("adminPassword") as string,
      address: formData.get("address") as string || undefined,
      about: formData.get("about") as string || undefined,
      themeId: selectedThemeId || undefined,
      isActive: formData.get("isActive") === "on",
    };

    if (editingShop) {
      updateMutation.mutate({ id: editingShop.id, data: shopData });
    } else {
      createMutation.mutate(shopData);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const filteredShops = data?.shops.filter(
    (shop) =>
      shop.shopName.toLowerCase().includes(search.toLowerCase()) ||
      shop.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Shops Management</h1>
            <p className="text-muted-foreground">
              Create and manage shops on the platform
            </p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search shops..."
                className="w-48 pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-shops"
              />
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openDialog(null)} data-testid="button-create-shop">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Shop
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingShop ? "Edit Shop" : "Create New Shop"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingShop
                      ? "Update shop details"
                      : "Set up a new shop on the platform"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="max-h-[60vh] space-y-4 overflow-y-auto py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="shopName">Shop Name</Label>
                        <Input
                          id="shopName"
                          name="shopName"
                          defaultValue={editingShop?.shopName || ""}
                          placeholder="My Restaurant"
                          required
                          onChange={(e) => {
                            if (!editingShop) {
                              const slugInput = document.getElementById("slug") as HTMLInputElement;
                              if (slugInput) {
                                slugInput.value = generateSlug(e.target.value);
                              }
                            }
                          }}
                          data-testid="input-shop-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="slug">URL Slug</Label>
                        <Input
                          id="slug"
                          name="slug"
                          defaultValue={editingShop?.slug || ""}
                          placeholder="my-restaurant"
                          required
                          pattern="[a-z0-9-]+"
                          title="Only lowercase letters, numbers, and hyphens"
                          data-testid="input-shop-slug"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="logo">Logo URL</Label>
                        <Input
                          id="logo"
                          name="logo"
                          type="url"
                          defaultValue={editingShop?.logo || ""}
                          placeholder="https://..."
                          data-testid="input-shop-logo"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="banner">Banner URL</Label>
                        <Input
                          id="banner"
                          name="banner"
                          type="url"
                          defaultValue={editingShop?.banner || ""}
                          placeholder="https://..."
                          data-testid="input-shop-banner"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                        <Input
                          id="whatsappNumber"
                          name="whatsappNumber"
                          defaultValue={editingShop?.whatsappNumber || ""}
                          placeholder="+91 9876543210"
                          data-testid="input-shop-whatsapp"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="adminPassword">Admin Password</Label>
                        <Input
                          id="adminPassword"
                          name="adminPassword"
                          type="text"
                          defaultValue={editingShop?.adminPassword || `Shop${Math.random().toString(36).slice(2, 8)}`}
                          placeholder="Shop admin password"
                          required
                          data-testid="input-shop-password"
                        />
                        <p className="text-xs text-muted-foreground">Password for shop admin login</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        name="address"
                        defaultValue={editingShop?.address || ""}
                        placeholder="Shop address"
                        data-testid="input-shop-address"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="about">About</Label>
                      <Textarea
                        id="about"
                        name="about"
                        defaultValue={editingShop?.about || ""}
                        placeholder="Tell customers about this shop"
                        data-testid="input-shop-about"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="themeId">Theme</Label>
                      <Select value={selectedThemeId} onValueChange={setSelectedThemeId}>
                        <SelectTrigger data-testid="select-shop-theme">
                          <SelectValue placeholder="Select theme" />
                        </SelectTrigger>
                        <SelectContent>
                          {data?.themes.map((theme) => (
                            <SelectItem key={theme.id} value={theme.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-4 w-4 rounded"
                                  style={{ backgroundColor: theme.primaryColor }}
                                />
                                {theme.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="isActive"
                        name="isActive"
                        defaultChecked={editingShop?.isActive ?? true}
                      />
                      <Label htmlFor="isActive">Active</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" data-testid="button-save-shop">
                      {editingShop ? "Update" : "Create"} Shop
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredShops && filteredShops.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredShops.map((shop) => (
              <Card
                key={shop.id}
                className={!shop.isActive ? "opacity-60" : ""}
                data-testid={`shop-card-${shop.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-muted">
                        {shop.logo ? (
                          <img src={shop.logo} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Building2 className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base">{shop.shopName}</CardTitle>
                        <CardDescription>/s/{shop.slug}</CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={shop.isActive ?? false}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: shop.id, isActive: checked })
                      }
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {shop.address && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {shop.address}
                    </p>
                  )}
                  
                  {/* Shop Admin URL with copy */}
                  <div className="flex items-center gap-2 rounded-md bg-muted p-2">
                    <UserCog className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground truncate flex-1">
                      /login/shop-admin?slug={shop.slug}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(`${baseUrl}/login/shop-admin?slug=${shop.slug}`)}
                      data-testid={`button-copy-admin-url-${shop.id}`}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {/* Password display */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Password:</span>
                    <code className="rounded bg-muted px-1.5 py-0.5">{shop.adminPassword}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => copyToClipboard(shop.adminPassword || "")}
                      data-testid={`button-copy-password-${shop.id}`}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Badge variant={shop.isActive ? "secondary" : "outline"}>
                      {shop.isActive ? (
                        <><CheckCircle2 className="mr-1 h-3 w-3" /> Active</>
                      ) : (
                        <><XCircle className="mr-1 h-3 w-3" /> Inactive</>
                      )}
                    </Badge>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <a href={`/s/${shop.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDialog(shop)}
                        data-testid={`button-edit-shop-${shop.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(shop.id)}
                        data-testid={`button-delete-shop-${shop.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">No shops found</h3>
              <p className="text-sm text-muted-foreground">
                {search
                  ? "No shops match your search"
                  : "Create your first shop to get started"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Availability Management Dialog */}
        <Dialog open={availabilityDialogOpen} onOpenChange={setAvailabilityDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Store Availability</DialogTitle>
              <DialogDescription>
                Manage operating hours and holidays for {selectedShopName}
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="hours" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="hours" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Hours
                </TabsTrigger>
                <TabsTrigger value="holidays" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Holidays
                </TabsTrigger>
              </TabsList>
              <TabsContent value="hours" className="mt-4">
                <StoreAvailabilitySettings
                  shopId={selectedShopId || ""}
                  initialAvailability={availabilityData?.availability || null}
                  onSave={async (data) => saveAvailabilityMutation.mutate(data)}
                  isLoading={saveAvailabilityMutation.isPending}
                />
              </TabsContent>
              <TabsContent value="holidays" className="mt-4">
                <HolidayManager
                  shopId={selectedShopId || ""}
                  initialHolidays={availabilityData?.holidays || []}
                  onHolidaysChange={() => {
                    queryClient.invalidateQueries({ queryKey: [`/api/super-admin/shops/${selectedShopId}/availability`] });
                  }}
                />
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
