import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Store, Palette, MessageCircle, Save, ExternalLink, Truck } from "lucide-react";
import { ImageUploadWithCrop } from "@/components/image-cropper";
import { DeliveryChargeSettings } from "@/components/DeliveryChargeSettings";
import type { Shop, ShopTheme } from "@shared/schema";

interface ShopSettings {
  shop: Shop;
  theme: ShopTheme | null;
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [bannerUrl, setBannerUrl] = useState<string>("");
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [isBannerUploading, setIsBannerUploading] = useState(false);

  const { data, isLoading } = useQuery<ShopSettings>({
    queryKey: ["/api/admin/settings"],
  });

  useEffect(() => {
    if (data?.shop) {
      setLogoUrl(data.shop.logo || "");
      setBannerUrl(data.shop.banner || "");
    }
  }, [data?.shop]);

  const handleImageUpload = async (blob: Blob, setUploading: (v: boolean) => void): Promise<string> => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", blob, "cropped-image.jpg");
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      
      if (!response.ok) throw new Error("Upload failed");
      
      const result = await response.json();
      toast({ title: "Image uploaded successfully" });
      return result.url;
    } catch {
      toast({ title: "Failed to upload image", variant: "destructive" });
      throw new Error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const updateShopMutation = useMutation({
    mutationFn: (shopData: Partial<Shop>) =>
      apiRequest("PATCH", "/api/admin/shop", shopData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Shop settings updated" });
    },
    onError: () => {
      toast({ title: "Failed to update settings", variant: "destructive" });
    },
  });

  const handleShopSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateShopMutation.mutate({
      shopName: formData.get("shopName") as string,
      logo: logoUrl || undefined,
      banner: bannerUrl || undefined,
      whatsappNumber: formData.get("whatsappNumber") as string || undefined,
      superAdminWhatsapp: formData.get("superAdminWhatsapp") as string || undefined,
      address: formData.get("address") as string || undefined,
      deliveryCharge: formData.get("deliveryCharge") ? String(parseFloat(formData.get("deliveryCharge") as string)) : "0",
      allowedPinCodes: formData.get("allowedPinCodes") as string || "495118",
      about: formData.get("about") as string || undefined,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Shop Settings</h1>
          <p className="text-muted-foreground">
            Manage your shop profile and preferences
          </p>
        </div>

        {isLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="general">
            <TabsList>
              <TabsTrigger value="general">
                <Store className="mr-2 h-4 w-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="delivery">
                <Truck className="mr-2 h-4 w-4" />
                Delivery
              </TabsTrigger>
              <TabsTrigger value="theme">
                <Palette className="mr-2 h-4 w-4" />
                Theme
              </TabsTrigger>
              <TabsTrigger value="whatsapp">
                <MessageCircle className="mr-2 h-4 w-4" />
                WhatsApp
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>General Information</CardTitle>
                  <CardDescription>
                    Basic details about your shop
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleShopSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="shopName">Shop Name</Label>
                      <Input
                        id="shopName"
                        name="shopName"
                        defaultValue={data?.shop.shopName || ""}
                        placeholder="Your shop name"
                        required
                        data-testid="input-shop-name"
                      />
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Logo (1:1)</Label>
                        <ImageUploadWithCrop
                          imageUrl={logoUrl}
                          onImageChange={setLogoUrl}
                          onUpload={(blob) => handleImageUpload(blob, setIsLogoUploading)}
                          isUploading={isLogoUploading}
                          defaultPreset="square"
                          previewClassName="w-24 h-24"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Banner (16:9)</Label>
                        <ImageUploadWithCrop
                          imageUrl={bannerUrl}
                          onImageChange={setBannerUrl}
                          onUpload={(blob) => handleImageUpload(blob, setIsBannerUploading)}
                          isUploading={isBannerUploading}
                          defaultPreset="banner"
                          previewClassName="w-48 h-27 aspect-video"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        name="address"
                        defaultValue={data?.shop.address || ""}
                        placeholder="Your shop address"
                        data-testid="input-address"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="allowedPinCodes">Allowed Pin Codes</Label>
                      <Input
                        id="allowedPinCodes"
                        name="allowedPinCodes"
                        defaultValue={data?.shop.allowedPinCodes || "495118"}
                        placeholder="Enter pin codes separated by commas (e.g., 495118,495001)"
                        data-testid="input-allowed-pin-codes"
                      />
                      <p className="text-sm text-muted-foreground">
                        Enter pin codes where you provide delivery service, separated by commas.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="about">About</Label>
                      <Textarea
                        id="about"
                        name="about"
                        defaultValue={data?.shop.about || ""}
                        placeholder="Tell customers about your shop"
                        rows={4}
                        data-testid="input-about"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        asChild
                      >
                        <a
                          href={`/s/${data?.shop.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="gap-2"
                          data-testid="link-preview-shop"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Preview Shop
                        </a>
                      </Button>
                      <Button type="submit" data-testid="button-save-settings">
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="delivery">
              <DeliveryChargeSettings />
            </TabsContent>

            <TabsContent value="theme">
              <Card>
                <CardHeader>
                  <CardTitle>Theme Settings</CardTitle>
                  <CardDescription>
                    Customize the look of your shop page
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data?.theme ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Primary Color</Label>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-10 w-10 rounded border border-border"
                              style={{ backgroundColor: data.theme.primaryColor }}
                            />
                            <Input
                              value={data.theme.primaryColor}
                              disabled
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Secondary Color</Label>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-10 w-10 rounded border border-border"
                              style={{ backgroundColor: data.theme.secondaryColor }}
                            />
                            <Input
                              value={data.theme.secondaryColor}
                              disabled
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Font Family</Label>
                        <Input
                          value={data.theme.fontFamily}
                          disabled
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Contact your admin to change theme settings.
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      No custom theme applied. Using default theme.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="whatsapp">
              <Card>
                <CardHeader>
                  <CardTitle>WhatsApp Integration</CardTitle>
                  <CardDescription>
                    Configure WhatsApp for customer communication
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleShopSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                      <Input
                        id="whatsappNumber"
                        name="whatsappNumber"
                        defaultValue={data?.shop.whatsappNumber || ""}
                        placeholder="+91 9876543210"
                        data-testid="input-whatsapp"
                      />
                      <p className="text-xs text-muted-foreground">
                        Include country code (e.g., +91 for India)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="superAdminWhatsapp">Super Admin WhatsApp</Label>
                      <Input
                        id="superAdminWhatsapp"
                        name="superAdminWhatsapp"
                        defaultValue={data?.shop.superAdminWhatsapp || ""}
                        placeholder="+91 9876543210"
                        data-testid="input-super-admin-whatsapp"
                      />
                      <p className="text-xs text-muted-foreground">
                        Super admin will receive all order notifications with complete customer details
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted p-4">
                      <h4 className="font-medium">WhatsApp Features</h4>
                      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <li>• Customers can send orders directly via WhatsApp</li>
                        <li>• Bill links are generated with wa.me format</li>
                        <li>• Quick contact button on shop page</li>
                      </ul>
                    </div>
                    <Button type="submit" data-testid="button-save-whatsapp">
                      <Save className="mr-2 h-4 w-4" />
                      Save WhatsApp Settings
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AdminLayout>
  );
}
