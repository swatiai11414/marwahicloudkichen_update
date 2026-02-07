import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { useQuery } from "@tanstack/react-query";
import { 
  Store, 
  Utensils, 
  ArrowRight,
  MapPin,
  User,
  ShieldCheck,
  Clock,
  Star,
  X
} from "lucide-react";
import { SiInstagram, SiFacebook, SiX } from "react-icons/si";
import { Link } from "wouter";
import { trackPageVisit } from "@/lib/track-visit";
import { StoreStatusBadge } from "@/components/StoreStatusBadge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { StoreStatusResponse } from "@/shared/schema";
import { canPlaceOrders } from "@/lib/availability";

interface Shop {
  id: string;
  slug: string;
  shopName: string;
  logo: string | null;
  address: string | null;
  about?: string | null;
}

export default function LandingPage() {
  const { data: shops = [], isLoading } = useQuery<Shop[]>({
    queryKey: ["/api/shops/list"],
  });

  // Store selected shop for modal
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [selectedShopStatus, setSelectedShopStatus] = useState<StoreStatusResponse | null>(null);

  useEffect(() => {
    trackPageVisit("/", null);
  }, []);

  // Fetch store status when modal opens
  useEffect(() => {
    if (!selectedShop) {
      setSelectedShopStatus(null);
      return;
    }

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/shops/${selectedShop.slug}/availability`);
        if (response.ok) {
          const data = await response.json();
          setSelectedShopStatus(data);
        }
      } catch (error) {
        console.error("Failed to fetch store status:", error);
      }
    };

    fetchStatus();
  }, [selectedShop]);

  // Close modal handler
  const closeModal = () => {
    setSelectedShop(null);
    setSelectedShopStatus(null);
  };

  // Navigate to store
  const visitStore = () => {
    if (selectedShop && canPlaceOrders(selectedShopStatus!)) {
      window.location.href = `/s/${selectedShop.slug}`;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Utensils className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">Marwahi Cloud Kitchen</span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="outline" size="sm" asChild data-testid="button-shop-admin">
              <a href="/login/shop-admin" className="gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Shop Admin</span>
              </a>
            </Button>
            <Button size="sm" asChild data-testid="button-super-admin">
              <a href="/login/super-admin" className="gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Super Admin</span>
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Our Partner Stores
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Browse and order from your favorite restaurants and hotels. Scan QR codes or visit their digital storefronts.
            </p>
          </div>

          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-0">
                    <div className="aspect-square bg-muted" />
                    <div className="p-4 space-y-3">
                      <div className="h-5 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : shops.length === 0 ? (
            <div className="text-center py-20">
              <Store className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold text-muted-foreground">No stores available yet</h3>
              <p className="mt-2 text-muted-foreground">
                Check back soon or contact the administrator.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {shops.map((shop) => (
                <Card 
                  key={shop.id}
                  className="group cursor-pointer overflow-hidden border-border/50 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover-elevate"
                  onClick={() => setSelectedShop(shop)}
                >
                  <CardContent className="p-0">
                    <div className="aspect-square relative bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden">
                      {shop.logo ? (
                        <img 
                          src={shop.logo} 
                          alt={shop.shopName}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <Store className="h-16 w-16 mb-2 opacity-30" />
                          <span className="text-3xl font-bold opacity-20">
                            {shop.shopName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      {/* Status indicator dot */}
                      <div className="absolute top-3 right-3 h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                        {shop.shopName}
                      </h3>
                      {shop.address && (
                        <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{shop.address}</span>
                        </p>
                      )}
                      <Button 
                        size="sm" 
                        className="w-full mt-3 gap-2 group-hover:bg-primary/90"
                        data-testid={`button-visit-${shop.slug}`}
                      >
                        View Store
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-border bg-muted/30 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Utensils className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-display font-semibold">HDOS</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Hotel Digital Operating System - Simplifying restaurant and hotel management.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-privacy-policy">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms-conditions" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-terms">
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-contact">
                    Contact Us
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Follow Us</h4>
              <div className="flex gap-3">
                <a 
                  href="https://www.instagram.com/khileshwhite" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors hover-elevate"
                  data-testid="link-instagram"
                  aria-label="Instagram"
                >
                  <SiInstagram className="h-4 w-4 text-pink-500" />
                </a>
                <a 
                  href="https://www.facebook.com/khileshwhite/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors hover-elevate"
                  data-testid="link-facebook"
                  aria-label="Facebook"
                >
                  <SiFacebook className="h-4 w-4 text-blue-600" />
                </a>
                <a 
                  href="https://x.com/khilesh25321781" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors hover-elevate"
                  data-testid="link-twitter"
                  aria-label="X (Twitter)"
                >
                  <SiX className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Contact</h4>
              <p className="text-sm text-muted-foreground">
                Have questions? Reach out to us.
              </p>
              <Link href="/contact">
                <Button variant="outline" size="sm" data-testid="button-contact-footer">
                  Get in Touch
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-border flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Hotel Digital Operating System. All rights reserved.
            </p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy</Link>
              <Link href="/terms-conditions" className="hover:text-primary transition-colors">Terms</Link>
              <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Shop Quick View Modal */}
      <Dialog open={!!selectedShop} onOpenChange={closeModal}>
        <DialogContent className="sm:max-w-md max-w-[95vw] mx-auto p-0 overflow-hidden">
          {/* Modal Header with Shop Banner */}
          <div className="relative">
            <div className="h-32 sm:h-48 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center overflow-hidden">
              {selectedShop?.logo ? (
                <img 
                  src={selectedShop.logo} 
                  alt={selectedShop?.shopName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Store className="h-20 w-20 text-primary/30" />
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70"
              onClick={closeModal}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6">
            <div className="space-y-4">
              {/* Shop Name & Status */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold">{selectedShop?.shopName}</h2>
                  {selectedShop?.address && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {selectedShop.address}
                    </p>
                  )}
                </div>
                {/* Store Status */}
                {selectedShopStatus && (
                  <StoreStatusBadge 
                    status={selectedShopStatus} 
                    size="sm" 
                    showHours={true} 
                  />
                )}
              </div>

              {/* About Section */}
              {selectedShop?.about && (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {selectedShop.about}
                </p>
              )}

              {/* Store Hours Info */}
              {selectedShopStatus && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Hours</span>
                      <span className="text-sm font-medium">
                        {selectedShopStatus.openingTime} - {selectedShopStatus.closingTime}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <span className={`text-sm font-medium ${
                        canPlaceOrders(selectedShopStatus) ? "text-green-600" : "text-red-600"
                      }`}>
                        {canPlaceOrders(selectedShopStatus) ? "Accepting Orders" : "Not Accepting Orders"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  className="flex-1 h-12 text-base font-semibold"
                  onClick={visitStore}
                  disabled={selectedShopStatus && !canPlaceOrders(selectedShopStatus)}
                >
                  <Utensils className="mr-2 h-5 w-5" />
                  {selectedShopStatus && canPlaceOrders(selectedShopStatus) 
                    ? "Browse Menu" 
                    : "View Store"
                  }
                </Button>
                <Button
                  variant="outline"
                  className="h-12 px-4"
                  onClick={closeModal}
                >
                  Close
                </Button>
              </div>

              {/* Note when closed */}
              {selectedShopStatus && !canPlaceOrders(selectedShopStatus) && (
                <p className="text-center text-sm text-muted-foreground bg-amber-50 dark:bg-amber/10 p-3 rounded-lg">
                  {selectedShopStatus.status === "holiday" 
                    ? `Store is closed for ${selectedShopStatus.holidayName}. You can still view the menu!`
                    : selectedShopStatus.nextOpenTime
                    ? `Store opens at ${selectedShopStatus.nextOpenTime}. You can still browse the menu!`
                    : "Store is currently closed. You can still browse the menu!"}
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
