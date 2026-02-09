import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { PageLoader } from "@/components/loading-spinner";
import { StoreStatusBadge } from "@/components/StoreStatusBadge";
import { useCart, CartProvider } from "@/lib/cart";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  getDeviceInfo, 
  getStoredSessionToken, 
  storeSessionToken,
  getStoredCustomer,
  storeCustomer
} from "@/lib/device-info";
import { downloadBillPDF } from "@/lib/bill-generator";
import { trackPageVisit } from "@/lib/track-visit";
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  MapPin, 
  MessageCircle,
  Star,
  X,
  CheckCircle,
  User,
  Phone,
  Search,
  Copy,
  Clock,
  Wallet,
  CreditCard,
  UtensilsCrossed,
  Loader2,
  ChevronDown,
  Filter,
  Share2,
  Download,
  FileText,
  ClipboardList
} from "lucide-react";
import type { Shop, ShopSection, MenuCategory, MenuItem, Offer, ShopTheme, Order, StoreStatusResponse } from "@shared/schema";

interface ShopData {
  shop: Shop;
  sections: ShopSection[];
  categories: MenuCategory[];
  menuItems: MenuItem[];
  offers: Offer[];
  theme?: ShopTheme;
}

interface CustomerInfo {
  id?: string;
  name: string;
  phone: string;
  address?: string;
  pinCode?: string;
  hasConsent: boolean;
}

interface SessionData {
  sessionToken: string;
  sessionId: string;
}

function ShopPageContent() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const { items, addItem, updateQuantity, removeItem, totalItems, totalAmount, clearCart } = useCart();
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({ name: "", phone: "", address: "", pinCode: "", hasConsent: false });
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [orderItemsSnapshot, setOrderItemsSnapshot] = useState<Array<{name: string; quantity: number; price: number}>>([]);
  const [tableNumber, setTableNumber] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVeg, setFilterVeg] = useState(false);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<"cash" | "upi" | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isReturningCustomer, setIsReturningCustomer] = useState(false);

  const { data, isLoading, error } = useQuery<ShopData>({
    queryKey: ["/api/shops", slug],
    enabled: !!slug,
  });

  // Fetch store availability status
  const { data: storeStatus } = useQuery<StoreStatusResponse>({
    queryKey: [`/api/shops/${slug}/availability`],
    enabled: !!slug,
    refetchInterval: 60000, // Refresh every minute to update status
  });

  // Calculate final total including delivery charge
  const deliveryCharge = Number(data?.shop?.deliveryCharge || 0);
  const freeDeliveryThreshold = data?.shop?.freeDeliveryThreshold ? Number(data?.shop.freeDeliveryThreshold) : null;
  const deliveryChargeReason = data?.shop?.deliveryChargeReason || null;
  
  // Check if free delivery applies
  const isFreeDelivery = freeDeliveryThreshold !== null && totalAmount >= freeDeliveryThreshold;
  const finalDeliveryCharge = isFreeDelivery ? 0 : deliveryCharge;
  const finalTotal = totalAmount + finalDeliveryCharge;
  
  // Calculate progress towards free delivery
  const freeDeliveryProgress = freeDeliveryThreshold 
    ? Math.min((totalAmount / freeDeliveryThreshold) * 100, 100)
    : 0;

  const [hasTrackedPageView, setHasTrackedPageView] = useState(false);
  const [lastTrackedSlug, setLastTrackedSlug] = useState<string | null>(null);

  // Reset page view tracking when slug changes
  useEffect(() => {
    if (slug && slug !== lastTrackedSlug) {
      setHasTrackedPageView(false);
    }
  }, [slug, lastTrackedSlug]);

  // Track page visit for Super Admin analytics
  useEffect(() => {
    if (data?.shop?.id && slug) {
      trackPageVisit(`/s/${slug}`, data.shop.id);
    }
  }, [data?.shop?.id, slug]);

  // Initialize session with device info
  useEffect(() => {
    if (!data?.shop?.id) return;

    const initSession = async () => {
      // Check for existing session
      const existingToken = getStoredSessionToken(data.shop.id);
      if (existingToken) {
        setSessionData({ sessionToken: existingToken, sessionId: "" });
      }

      // Check for returning customer
      const storedCustomer = getStoredCustomer(data.shop.id);
      if (storedCustomer) {
        setCustomerInfo({ 
          id: storedCustomer.id,
          name: storedCustomer.name, 
          phone: storedCustomer.phone,
          hasConsent: true
        });
        setIsReturningCustomer(true);
      }

      // Create new session if none exists
      if (!existingToken) {
        try {
          const deviceInfo = getDeviceInfo();
          const response = await apiRequest("POST", `/api/shops/${slug}/session`, deviceInfo);
          const result = await response.json();
          if (result.sessionToken) {
            storeSessionToken(data.shop.id, result.sessionToken);
            setSessionData({ sessionToken: result.sessionToken, sessionId: result.session?.id || "" });
          }
        } catch (err) {
          console.error("Failed to init session:", err);
        }
      }
    };

    initSession();
  }, [data?.shop?.id, slug]);

  // Track page view after session is ready
  useEffect(() => {
    if (!sessionData?.sessionToken || hasTrackedPageView || !slug) return;
    
    const trackPageView = async () => {
      try {
        await apiRequest("POST", `/api/shops/${slug}/behavior`, {
          eventType: "page_view",
          page: window.location.pathname,
          metadata: { page: "shop" },
          sessionToken: sessionData.sessionToken,
          customerId: customerInfo.id,
        });
        setHasTrackedPageView(true);
        setLastTrackedSlug(slug);
      } catch (err) {
        // Silently fail for tracking
      }
    };

    trackPageView();
  }, [sessionData?.sessionToken, hasTrackedPageView, slug, customerInfo.id]);

  const trackBehavior = useCallback(async (eventType: string, metadata?: Record<string, unknown>) => {
    if (!slug || !sessionData?.sessionToken) return;
    try {
      await apiRequest("POST", `/api/shops/${slug}/behavior`, {
        eventType,
        page: window.location.pathname,
        metadata,
        sessionToken: sessionData.sessionToken,
        customerId: customerInfo.id,
      });
    } catch (err) {
      // Silently fail for tracking
    }
  }, [slug, sessionData?.sessionToken, customerInfo.id]);

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: { 
      items: Array<{ itemId: string; quantity: number }>; 
      customer: CustomerInfo; 
      tableQr?: string; 
      notes?: string;
      deliveryAddress?: string;
      sessionToken?: string;
    }) => {
      const response = await apiRequest("POST", `/api/shops/${slug}/orders`, orderData);
      // Check if response is ok, if not throw error with message
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to place order");
      }
      return response.json();
    },
    onSuccess: (order: Order) => {
      // Snapshot the cart items at order creation for accurate bill generation
      const itemsForBill = items.map(cartItem => ({
        name: cartItem.item.name,
        quantity: cartItem.quantity,
        price: Number(cartItem.item.price),
      }));
      setOrderItemsSnapshot(itemsForBill);
      
      setCreatedOrder(order);
      setShowLoginModal(false);
      
      // Show success modal first, then user continues to payment
      setShowSuccessModal(true);
      
      // Store customer for auto-recognition
      if (data?.shop?.id && customerInfo.phone) {
        storeCustomer(data.shop.id, {
          id: order.customerId || "",
          name: customerInfo.name,
          phone: customerInfo.phone,
        });
      }

      trackBehavior("order_placed", { orderId: order.id, total: finalTotal });
      toast({ title: "Order placed successfully!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Cannot place order", 
        description: error.message || "Failed to place order. Please try again.",
        variant: "destructive" 
      });
    },
  });

  const handlePlaceOrder = () => {
    // Check if store is open
    if (storeStatus && !storeStatus.isOpen) {
      toast({ 
        title: "Store is currently closed", 
        description: storeStatus.status === "holiday" 
          ? `We're closed for ${storeStatus.holidayName}. Please order when we reopen.`
          : storeStatus.nextOpenTime 
          ? `We'll open at ${storeStatus.nextOpenTime}. Please order later.`
          : "Sorry, we're not accepting orders right now.",
        variant: "destructive" 
      });
      return;
    }

    if (!customerInfo.name.trim() || !customerInfo.phone.trim()) {
      toast({ title: "Please enter your name and phone number", variant: "destructive" });
      return;
    }

    if (customerInfo.phone.length < 10) {
      toast({ title: "Please enter a valid phone number", variant: "destructive" });
      return;
    }

    if (!customerInfo.pinCode?.trim()) {
      toast({ title: "Please enter your pin code", variant: "destructive" });
      return;
    }

    if (customerInfo.pinCode.length !== 6) {
      toast({ title: "Please enter a valid 6-digit pin code", variant: "destructive" });
      return;
    }

    // Check if pin code is allowed
    const allowedPinCodes = data?.shop?.allowedPinCodes?.split(',').map(code => code.trim()) || ['495118'];
    if (!allowedPinCodes.includes(customerInfo.pinCode!)) {
      toast({ 
        title: "Delivery not available", 
        description: "Sorry, we don't deliver to this pin code area.",
        variant: "destructive" 
      });
      return;
    }

    // Validate cart has items
    if (!items || items.length === 0) {
      toast({ 
        title: "Cart is empty", 
        description: "Please add some items to your cart first.",
        variant: "destructive" 
      });
      return;
    }

    trackBehavior("checkout_start", { itemCount: items.length, total: finalTotal });

    // Create order items - make sure to pass proper format
    const orderItems = items.map((item) => ({
      itemId: item.item.id,
      quantity: item.quantity,
    }));

    // Prepare customer data
    const orderCustomer = {
      name: customerInfo.name.trim(),
      phone: customerInfo.phone.trim(),
      address: customerInfo.address?.trim() || "",
      pinCode: customerInfo.pinCode?.trim() || "",
      hasConsent: customerInfo.hasConsent,
    };

    createOrderMutation.mutate({
      items: orderItems,
      customer: orderCustomer,
      tableQr: tableNumber?.trim() || undefined,
      notes: orderNotes?.trim() || undefined,
      deliveryAddress: customerInfo.address ? `${customerInfo.address.trim()}, Pin Code: ${customerInfo.pinCode!.trim()}` : `Pin Code: ${customerInfo.pinCode!.trim()}`,
    });
  };

  const handleAddToCart = useCallback((item: MenuItem) => {
    addItem(item);
    trackBehavior("add_to_cart", { itemId: item.id, itemName: item.name, price: item.price });
  }, [addItem, trackBehavior]);

  const handleItemView = useCallback((item: MenuItem) => {
    trackBehavior("item_view", { itemId: item.id, itemName: item.name });
  }, [trackBehavior]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard!" });
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  // Filter and search menu items
  const filteredMenuItems = useMemo(() => {
    if (!data?.menuItems) return [];
    
    return data.menuItems.filter((item) => {
      if (!item.isAvailable) return false;
      if (filterVeg && !item.isVeg) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [data?.menuItems, searchQuery, filterVeg]);

  if (isLoading) return <PageLoader />;

  if (error || !data?.shop) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="text-center">
          <UtensilsCrossed className="mx-auto h-16 w-16 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Shop not found</h1>
          <p className="mt-2 text-muted-foreground">
            The shop you're looking for doesn't exist or has been deactivated.
          </p>
        </div>
      </div>
    );
  }

  const { shop, theme, sections, categories, offers } = data;

  const heroSection = sections.find((s) => s.sectionType === "hero" && s.isVisible);
  const menuSection = sections.find((s) => s.sectionType === "menu" && s.isVisible);
  const offersSection = sections.find((s) => s.sectionType === "offers" && s.isVisible);
  const aboutSection = sections.find((s) => s.sectionType === "about" && s.isVisible);
  const gallerySection = sections.find((s) => s.sectionType === "gallery" && s.isVisible);

  const getItemsByCategory = (categoryId: string) =>
    filteredMenuItems.filter((item) => item.categoryId === categoryId);

  const uncategorizedItems = filteredMenuItems.filter((item) => !item.categoryId);

  const activeOffers = offers.filter((o) => o.isActive && (!o.expiryDate || new Date(o.expiryDate) > new Date()));

  const whatsappLink = shop.whatsappNumber
    ? `https://wa.me/${shop.whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
        `Hi, I'm at ${shop.shopName}!`
      )}`
    : null;

  const generateBillWhatsAppLink = (order: Order) => {
    if (!shop.whatsappNumber) return null;
    const billText = [
      `*Order #${order.orderNumber || order.id.slice(-8)}*`,
      `From: ${shop.shopName}`,
      ``,
      `Subtotal: ₹${Number(order.subtotal).toFixed(2)}`,
      Number(order.deliveryCharge) > 0 ? `Delivery: ₹${Number(order.deliveryCharge).toFixed(2)}` : "",
      `*Total: ₹${Number(order.totalAmount).toFixed(2)}*`,
      tableNumber ? `Table: ${tableNumber}` : "",
      `Status: ${order.status === "pending_payment" ? "Awaiting Payment" : order.status}`,
      ``,
      `Please pay at the counter.`,
    ].filter(Boolean).join("\n");
    return `https://wa.me/${shop.whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(billText)}`;
  };

  const generateOrderWhatsAppLink = (order: Order, orderItems: Array<{name: string; quantity: number; price: number}>) => {
    if (!shop.whatsappNumber) return null;

    const itemLines = orderItems.map(item =>
      `  - ${item.quantity}x ${item.name} - Rs.${(item.price * item.quantity).toFixed(2)}`
    ).join("\n");

    const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const billText = [
      `*NEW ORDER - ${shop.shopName}*`,
      ``,
      `*Order #${order.orderNumber || order.id.slice(-8).toUpperCase()}*`,
      tableNumber ? `Table: ${tableNumber}` : "",
      ``,
      `*Items:*`,
      itemLines,
      ``,
      `-------------------`,
      `Subtotal: Rs.${subtotal.toFixed(2)}`,
      Number(order.deliveryCharge) > 0 ? `Delivery: Rs.${Number(order.deliveryCharge).toFixed(2)}` : "",
      Number(order.discountAmount) > 0 ? `Discount: -Rs.${Number(order.discountAmount).toFixed(2)}` : "",
      `*Total: Rs.${Number(order.totalAmount).toFixed(2)}*`,
      `-------------------`,
      ``,
      `*Customer Details:*`,
      `Name: ${customerInfo.name}`,
      `Phone: ${customerInfo.phone}`,
      customerInfo.address ? `Address: ${customerInfo.address}, Pin Code: ${customerInfo.pinCode}` : `Pin Code: ${customerInfo.pinCode}`,
      orderNotes ? `Notes: ${orderNotes}` : "",
      ``,
      `*Status:* Awaiting Payment`,
    ].filter(Boolean).join("\n");

    const shopLink = `https://wa.me/${shop.whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(billText)}`;
    const superAdminLink = shop.superAdminWhatsapp ? `https://wa.me/${shop.superAdminWhatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(billText)}` : null;

    return { shopLink, superAdminLink };
  };

  const handleDownloadBill = (order: Order) => {
    // Use the snapshotted items from order creation for accurate bill
    const billItems = orderItemsSnapshot.length > 0 
      ? orderItemsSnapshot 
      : items.map(cartItem => ({
          name: cartItem.item.name,
          quantity: cartItem.quantity,
          price: Number(cartItem.item.price),
        }));
    
    const subtotal = billItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryCharge = Number(order.deliveryCharge || 0);

    downloadBillPDF({
      shopName: shop.shopName,
      shopLogo: shop.logo || undefined,
      shopAddress: shop.address || undefined,
      shopPhone: shop.whatsappNumber || undefined,
      billNumber: order.billNumber || `ORD-${order.orderNumber || order.id.slice(-8)}`,
      orderNumber: order.orderNumber || order.id.slice(-8).toUpperCase(),
      date: new Date(order.createdAt || Date.now()),
      customerName: customerInfo.name,
      customerPhone: customerInfo.phone,
      customerAddress: customerInfo.address ? `${customerInfo.address}, Pin Code: ${customerInfo.pinCode}` : `Pin Code: ${customerInfo.pinCode}`,
      tableNumber: tableNumber || undefined,
      items: billItems,
      subtotal: subtotal,
      deliveryCharge: deliveryCharge > 0 ? deliveryCharge : undefined,
      discount: 0,
      total: Number(order.totalAmount),
      paymentMode: selectedPaymentMode || "cash",
      upiId: shop.upiId || undefined,
    });
  };

  const themeStyles = theme ? {
    "--shop-primary": theme.primaryColor,
    "--shop-secondary": theme.secondaryColor,
  } as React.CSSProperties : {};

  return (
    <div className="min-h-screen bg-background" style={themeStyles}>
      {/* Hero Section */}
      {heroSection && (
        <section className="relative h-[45vh] min-h-[280px] overflow-hidden">
          {shop.banner ? (
            <img
              src={shop.banner}
              alt={shop.shopName}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/20 to-transparent" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-6 text-center text-white">
            {shop.logo && (
              <div className="mb-3 h-20 w-20 overflow-hidden rounded-full border-4 border-white/30 bg-white shadow-xl">
                <img src={shop.logo} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <h1 className="font-display text-2xl font-bold sm:text-3xl">{shop.shopName}</h1>
            {shop.address && (
              <div className="mt-2 flex items-center gap-1 text-sm text-white/80">
                <MapPin className="h-4 w-4" />
                <span className="max-w-xs truncate">{shop.address}</span>
              </div>
            )}
            
            {/* Store Status Badge */}
            {storeStatus && (
              <div className="mt-3">
                <StoreStatusBadge 
                  status={storeStatus} 
                  size="md" 
                  showHours={true} 
                />
              </div>
            )}
            
            {isReturningCustomer && (
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Star className="h-3 w-3 fill-current" />
                  Welcome back, {customerInfo.name.split(" ")[0]}!
                </Badge>
                <Link href={`/s/${slug}/my-orders`}>
                  <Button size="sm" variant="secondary" className="gap-1" data-testid="button-my-orders">
                    <ClipboardList className="h-3 w-3" />
                    My Orders
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Store Closed Banner */}
      {storeStatus && !storeStatus.isOpen && (
        <div className="mx-4 mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                  {storeStatus.status === "holiday" 
                    ? `We're closed for ${storeStatus.holidayName}` 
                    : storeStatus.nextOpenTime 
                    ? `We're closed. Opens at ${storeStatus.nextOpenTime}`
                    : "We're currently closed"}
                </h3>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {storeStatus.status === "holiday"
                    ? "Enjoy browsing our menu and order when we reopen!"
                    : "You can still browse our menu. Orders will be accepted when we reopen."}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300">
              {storeStatus.status === "holiday" ? "Holiday" : storeStatus.nextOpenTime ? `Opens ${storeStatus.nextOpenTime}` : "Closed"}
            </Badge>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* Active Offers */}
        {offersSection && activeOffers.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <Star className="h-5 w-5 text-yellow-500" />
              Special Offers
            </h2>
            <ScrollArea className="w-full">
              <div className="flex gap-3 pb-2">
                {activeOffers.map((offer) => (
                  <Card
                    key={offer.id}
                    className="min-w-[240px] border-none bg-gradient-to-br from-primary/10 via-primary/5 to-transparent"
                    data-testid={`card-offer-${offer.id}`}
                  >
                    <CardContent className="p-4">
                      <Badge variant="secondary" className="mb-2">
                        {offer.discountType === "percentage"
                          ? `${offer.discountValue}% OFF`
                          : `₹${offer.discountValue} OFF`}
                      </Badge>
                      <h3 className="font-semibold">{offer.title}</h3>
                      {offer.description && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{offer.description}</p>
                      )}
                      {offer.minOrderAmount && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Min. order: ₹{Number(offer.minOrderAmount).toFixed(0)}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </section>
        )}

        {/* Menu Section */}
        {menuSection && (
          <section className="mb-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold">Menu</h2>
              <div className="flex gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search menu..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-menu"
                  />
                </div>
                <Button
                  variant={filterVeg ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterVeg(!filterVeg)}
                  className="gap-1"
                  data-testid="button-filter-veg"
                >
                  <div className="flex h-4 w-4 items-center justify-center rounded border border-green-600">
                    <div className="h-2 w-2 rounded-full bg-green-600" />
                  </div>
                  Veg
                </Button>
              </div>
            </div>
            
            {categories.length > 0 ? (
              <Tabs defaultValue={categories[0]?.id} className="w-full">
                <ScrollArea className="w-full">
                  <TabsList className="mb-4 w-max">
                    {categories.map((category) => (
                      <TabsTrigger
                        key={category.id}
                        value={category.id}
                        data-testid={`tab-category-${category.id}`}
                      >
                        {category.name}
                        {getItemsByCategory(category.id).length > 0 && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({getItemsByCategory(category.id).length})
                          </span>
                        )}
                      </TabsTrigger>
                    ))}
                    {uncategorizedItems.length > 0 && (
                      <TabsTrigger value="other">Other</TabsTrigger>
                    )}
                  </TabsList>
                </ScrollArea>

                {categories.map((category) => (
                  <TabsContent key={category.id} value={category.id}>
                    <div className="grid gap-3">
                      {getItemsByCategory(category.id).map((item) => (
                        <MenuItemCard
                          key={item.id}
                          item={item}
                          cartItem={items.find((i) => i.item.id === item.id)}
                          onAdd={() => handleAddToCart(item)}
                          onView={() => handleItemView(item)}
                          onUpdateQuantity={(qty) => updateQuantity(item.id, qty)}
                        />
                      ))}
                      {getItemsByCategory(category.id).length === 0 && (
                        <p className="py-8 text-center text-muted-foreground">
                          {searchQuery || filterVeg ? "No matching items" : "No items available"}
                        </p>
                      )}
                    </div>
                  </TabsContent>
                ))}

                {uncategorizedItems.length > 0 && (
                  <TabsContent value="other">
                    <div className="grid gap-3">
                      {uncategorizedItems.map((item) => (
                        <MenuItemCard
                          key={item.id}
                          item={item}
                          cartItem={items.find((i) => i.item.id === item.id)}
                          onAdd={() => handleAddToCart(item)}
                          onView={() => handleItemView(item)}
                          onUpdateQuantity={(qty) => updateQuantity(item.id, qty)}
                        />
                      ))}
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            ) : (
              <div className="grid gap-3">
                {filteredMenuItems.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    cartItem={items.find((i) => i.item.id === item.id)}
                    onAdd={() => handleAddToCart(item)}
                    onView={() => handleItemView(item)}
                    onUpdateQuantity={(qty) => updateQuantity(item.id, qty)}
                  />
                ))}
                {filteredMenuItems.length === 0 && (
                  <p className="py-8 text-center text-muted-foreground">
                    {searchQuery || filterVeg ? "No matching items" : "No menu items available"}
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* About Section */}
        {aboutSection && shop.about && (
          <section className="mb-6">
            <h2 className="mb-3 text-lg font-semibold">About Us</h2>
            <Card>
              <CardContent className="p-4">
                <p className="text-muted-foreground">{shop.about}</p>
              </CardContent>
            </Card>
          </section>
        )}

        {/* WhatsApp Contact */}
        {whatsappLink && (
          <section className="mb-6">
            <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500 flex-shrink-0">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">Need Help?</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    Chat on WhatsApp
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild data-testid="button-whatsapp-contact">
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                    Chat
                  </a>
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Bottom spacing for cart button */}
        <div className="h-20" />
      </main>

      {/* Floating Cart Button */}
      {totalItems > 0 && (
        <Sheet>
          <SheetTrigger asChild>
            <Button
              size="lg"
              className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 gap-2 shadow-lg h-auto py-3 px-6 flex-col"
              data-testid="button-view-cart"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <span className="font-semibold">{totalItems} items</span>
                <Separator orientation="vertical" className="h-5 bg-white/30" />
                <span className="font-bold">₹{finalTotal.toFixed(0)}</span>
              </div>
              {finalDeliveryCharge > 0 && !isFreeDelivery && (
                <span className="text-xs opacity-90 flex items-center gap-1">
                  <span>Includes</span>
                  <span className="font-medium">Delivery ₹{finalDeliveryCharge.toFixed(0)}</span>
                  {deliveryChargeReason && (
                    <span className="opacity-75">({deliveryChargeReason})</span>
                  )}
                </span>
              )}
              {isFreeDelivery && (
                <span className="text-xs opacity-90 flex items-center gap-1 text-green-200">
                  <CheckCircle className="h-3 w-3" />
                  <span className="font-medium">Free Delivery!</span>
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="flex flex-col h-full max-h-[85vh] sm:max-h-[70vh]">
            <SheetHeader className="flex-shrink-0">
              <SheetTitle>Your Order ({totalItems})</SheetTitle>
            </SheetHeader>
            
            <ScrollArea className="flex-1 py-4 px-1">
              <div className="space-y-4">
                {items.map((cartItem) => (
                  <div key={cartItem.item.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {cartItem.item.isVeg && (
                          <div className="flex h-5 w-5 items-center justify-center rounded border border-green-600 flex-shrink-0">
                            <div className="h-2 w-2 rounded-full bg-green-600" />
                          </div>
                        )}
                        <p className="font-medium truncate">{cartItem.item.name}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ₹{Number(cartItem.item.price).toFixed(0)} × {cartItem.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-9 w-9"
                        onClick={() => updateQuantity(cartItem.item.id, cartItem.quantity - 1)}
                        data-testid={`button-decrease-${cartItem.item.id}`}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">{cartItem.quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-9 w-9"
                        onClick={() => updateQuantity(cartItem.item.id, cartItem.quantity + 1)}
                        data-testid={`button-increase-${cartItem.item.id}`}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive flex-shrink-0"
                      onClick={() => {
                        removeItem(cartItem.item.id);
                        trackBehavior("remove_from_cart", { itemId: cartItem.item.id });
                      }}
                      data-testid={`button-remove-${cartItem.item.id}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Separator />

            <div className="space-y-4 pt-4">
              {/* Table Number */}
              <div className="space-y-2">
                <Label htmlFor="tableNumber" className="text-sm font-medium">Table / Token</Label>
                <Input
                  id="tableNumber"
                  placeholder="Table 5"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="h-11"
                  data-testid="input-table-number"
                />
              </div>

              {/* Special Instructions */}
              <div className="space-y-2">
                <Label htmlFor="orderNotes" className="text-sm font-medium">Instructions (optional)</Label>
                <Textarea
                  id="orderNotes"
                  placeholder="Any special requests..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  rows={2}
                  className="resize-none"
                  data-testid="input-order-notes"
                />
              </div>

              {/* Order Summary */}
              <Card className="bg-muted/50 border-primary/20">
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Items ({totalItems})</span>
                    <span>₹{totalAmount.toFixed(0)}</span>
                  </div>
                  
                  {/* Free Delivery Progress */}
                  {freeDeliveryThreshold !== null && totalAmount > 0 && (
                    <div className="flex flex-col gap-2">
                      {isFreeDelivery ? (
                        <div className="flex items-center justify-between text-sm bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                          <span className="flex items-center gap-1.5 text-green-700 dark:text-green-400 font-medium">
                            <CheckCircle className="h-4 w-4" />
                            Free Delivery Applied!
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              Add ₹{(freeDeliveryThreshold - totalAmount).toFixed(0)} more for free delivery
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                            <div 
                              className="h-full bg-amber-500 transition-all duration-300"
                              style={{ width: `${freeDeliveryProgress}%` }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* Delivery Charge - Prominent Display */}
                  {finalDeliveryCharge > 0 ? (
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/50">
                            <span className="text-lg">🚚</span>
                          </div>
                          <div>
                            <span className="font-medium text-orange-900 dark:text-orange-100 block">Delivery Charge</span>
                            {deliveryChargeReason && (
                              <span className="text-xs text-orange-600 dark:text-orange-400 block">
                                {deliveryChargeReason}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="font-bold text-orange-700 dark:text-orange-300 whitespace-nowrap">
                          ₹{finalDeliveryCharge.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  ) : isFreeDelivery ? (
                    <div className="bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-200 dark:bg-green-800">
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <span className="font-medium text-green-900 dark:text-green-100 block">Free Delivery</span>
                            <span className="text-xs text-green-600 dark:text-green-400 block">
                              Orders above ₹{freeDeliveryThreshold?.toFixed(0)} qualify
                            </span>
                          </div>
                        </div>
                        <span className="font-bold text-green-700 dark:text-green-400 whitespace-nowrap">₹0</span>
                      </div>
                    </div>
                  ) : null}
                  
                  <Separator />
                  <div className="flex items-center justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-lg font-bold">₹{finalTotal.toFixed(0)}</span>
                  </div>
                </CardContent>
              </Card>

              <Button 
                className="w-full gap-2 h-12 text-base font-semibold" 
                size="lg" 
                onClick={() => setShowLoginModal(true)}
                disabled={storeStatus && !storeStatus.isOpen}
                data-testid="button-place-order"
              >
                <ShoppingCart className="h-5 w-5" />
                {storeStatus && !storeStatus.isOpen ? "Store Closed" : "Place Order - ₹" + finalTotal.toFixed(0)}
              </Button>

              <Button
                variant="outline"
                className="w-full h-10"
                onClick={() => {
                  clearCart();
                  trackBehavior("exit", { reason: "clear_cart" });
                }}
                data-testid="button-clear-cart"
              >
                Clear Cart
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Customer Login Modal */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md max-w-[95vw] mx-auto">
          <DialogHeader>
            <DialogTitle>Complete Your Order</DialogTitle>
            <DialogDescription className="text-sm">
              {isReturningCustomer 
                ? `Welcome back! Confirm your details to place the order.`
                : `Enter your details to place the order`}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="customerName" className="text-sm font-medium">Your Name</Label>
                <Input
                  id="customerName"
                  placeholder="Enter your name"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                  className="h-12 text-base"
                  data-testid="input-customer-name"
                  autoComplete="name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerPhone" className="text-sm font-medium">Phone Number</Label>
                <Input
                  id="customerPhone"
                  placeholder="+91 9876543210"
                  type="tel"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                  className="h-12 text-base"
                  data-testid="input-customer-phone"
                  autoComplete="tel"
                  inputMode="tel"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerAddress" className="text-sm font-medium">Delivery Address</Label>
                <Textarea
                  id="customerAddress"
                  placeholder="Enter your full address"
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                  className="min-h-[80px] resize-none text-base"
                  data-testid="input-customer-address"
                  autoComplete="street-address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerPinCode" className="text-sm font-medium">Pin Code</Label>
                <Input
                  id="customerPinCode"
                  placeholder="6-digit pin code"
                  type="text"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={customerInfo.pinCode}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, pinCode: e.target.value.replace(/\D/g, '') })}
                  className="h-12 text-base"
                  data-testid="input-customer-pincode"
                  autoComplete="postal-code"
                  inputMode="numeric"
                />
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Checkbox
                  id="hasConsent"
                  checked={customerInfo.hasConsent}
                  onCheckedChange={(checked) => setCustomerInfo({ ...customerInfo, hasConsent: checked === true })}
                  data-testid="checkbox-consent"
                  className="mt-1 h-5 w-5"
                />
                <Label htmlFor="hasConsent" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                  I agree to receive order updates via WhatsApp. Your data is secure.
                </Label>
              </div>

              <Card className="bg-muted/50">
                <CardContent className="p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Items</span>
                    <span className="font-medium">{totalItems}</span>
                  </div>
                  {tableNumber && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Table</span>
                      <span className="font-medium">{tableNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">₹{totalAmount.toFixed(2)}</span>
                  </div>
                  
                  {/* Free Delivery Status in Modal */}
                  {freeDeliveryThreshold !== null && totalAmount > 0 && (
                    <div className="py-1">
                      {isFreeDelivery ? (
                        <div className="flex items-center gap-1 text-sm text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          Free Delivery Applied!
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Free delivery on orders above ₹{freeDeliveryThreshold.toFixed(0)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {finalDeliveryCharge > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Delivery
                        {deliveryChargeReason && (
                          <span className="block text-xs text-muted-foreground/70">
                            {deliveryChargeReason}
                          </span>
                        )}
                      </span>
                      <span className="font-medium">₹{finalDeliveryCharge.toFixed(2)}</span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-lg">₹{finalTotal.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>

          <div className="flex flex-col gap-2 pt-2">
            <Button 
              onClick={handlePlaceOrder} 
              disabled={createOrderMutation.isPending || (storeStatus && !storeStatus.isOpen)}
              className="h-12 text-base font-semibold"
              data-testid="button-confirm-order"
            >
              {createOrderMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Placing Order...
                </>
              ) : storeStatus && !storeStatus.isOpen ? (
                "Store Closed"
              ) : (
                <>Confirm Order - ₹{finalTotal.toFixed(2)}</>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowLoginModal(false)}
              className="h-10"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md max-w-[95vw] mx-auto">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">Order Placed!</DialogTitle>
            <DialogDescription className="text-center text-sm">
              Select payment method
            </DialogDescription>
          </DialogHeader>
          
          {createdOrder && (
            <div className="space-y-4 py-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Order Number</p>
                  <p className="text-2xl font-bold mt-1">
                    #{createdOrder.orderNumber || createdOrder.id.slice(-8).toUpperCase()}
                  </p>
                  {tableNumber && (
                    <p className="text-sm text-muted-foreground mt-1">Table: {tableNumber}</p>
                  )}
                  <p className="text-3xl font-bold text-primary mt-3">
                    ₹{Number(createdOrder.totalAmount).toFixed(2)}
                  </p>
                  <Badge variant="secondary" className="mt-3">
                    <Clock className="mr-1 h-3 w-3" />
                    Awaiting Payment
                  </Badge>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <h3 className="col-span-2 font-semibold text-center text-sm">Select Payment</h3>
                
                {/* Cash Payment */}
                <Button
                  variant={selectedPaymentMode === "cash" ? "default" : "outline"}
                  className="h-auto flex-col gap-2 p-4"
                  onClick={() => setSelectedPaymentMode("cash")}
                  data-testid="button-pay-cash"
                >
                  <Wallet className="h-6 w-6" />
                  <span className="font-semibold text-sm">Cash</span>
                  <span className="text-xs text-muted-foreground text-center">Pay at counter</span>
                </Button>

                {/* UPI Payment */}
                <Button
                  variant={selectedPaymentMode === "upi" ? "default" : "outline"}
                  className="h-auto flex-col gap-2 p-4"
                  onClick={() => setSelectedPaymentMode("upi")}
                  data-testid="button-pay-upi"
                >
                  <CreditCard className="h-6 w-6" />
                  <span className="font-semibold text-sm">UPI</span>
                  <span className="text-xs text-muted-foreground text-center">Scan QR</span>
                </Button>
              </div>

              {/* UPI Details */}
              {selectedPaymentMode === "upi" && shop.upiId && (
                <Card className="border-primary">
                  <CardContent className="p-4 space-y-4">
                    {shop.upiQrImage && (
                      <div className="flex justify-center">
                        <img 
                          src={shop.upiQrImage} 
                          alt="UPI QR Code" 
                          className="h-48 w-48 rounded-lg border"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                      <div>
                        <p className="text-xs text-muted-foreground">UPI ID</p>
                        <p className="font-mono font-semibold">{shop.upiId}</p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copyToClipboard(shop.upiId!)}
                        data-testid="button-copy-upi"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-center text-muted-foreground">
                      After payment, show the confirmation to staff
                    </p>
                  </CardContent>
                </Card>
              )}

              {selectedPaymentMode && (
                <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
                  <CardContent className="p-4 text-center">
                    <Clock className="mx-auto h-6 w-6 text-blue-600 mb-2" />
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      Waiting for Payment Confirmation
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      {selectedPaymentMode === "cash" 
                        ? "Please pay at the counter. Staff will confirm your payment."
                        : "Complete the UPI payment and show confirmation to staff."}
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-col gap-2">
                {/* Send Order to WhatsApp - Primary Action */}
                {shop.whatsappNumber && generateOrderWhatsAppLink(createdOrder, orderItemsSnapshot)?.shopLink && (
                  <Button
                    className="w-full gap-2 h-11 bg-green-600 hover:bg-green-700 text-white font-semibold"
                    asChild
                    data-testid="button-send-whatsapp"
                  >
                    <a
                      href={generateOrderWhatsAppLink(createdOrder, orderItemsSnapshot)!.shopLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="h-5 w-5" />
                      Send to Shop
                    </a>
                  </Button>
                )}

                {/* Send Order to Super Admin WhatsApp */}
                {shop.superAdminWhatsapp && generateOrderWhatsAppLink(createdOrder, orderItemsSnapshot)?.superAdminLink && (
                  <Button
                    className="w-full gap-2 h-10 bg-blue-600 hover:bg-blue-700 text-white"
                    asChild
                    data-testid="button-send-superadmin-whatsapp"
                  >
                    <a
                      href={generateOrderWhatsAppLink(createdOrder, orderItemsSnapshot)!.superAdminLink!}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Notify Admin
                    </a>
                  </Button>
                )}
                
                {/* Bill download only available after payment is confirmed */}
                {createdOrder.status !== "pending_payment" && (
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1 gap-2" 
                      variant="outline"
                      onClick={() => handleDownloadBill(createdOrder)}
                      data-testid="button-download-bill"
                    >
                      <Download className="h-4 w-4" />
                      Download Bill
                    </Button>
                    {generateBillWhatsAppLink(createdOrder) && (
                      <Button className="flex-1 gap-2" variant="outline" asChild>
                        <a href={generateBillWhatsAppLink(createdOrder)!} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="h-4 w-4" />
                          Share Bill
                        </a>
                      </Button>
                    )}
                  </div>
                )}
                <Button 
                  className="flex-1" 
                  variant="outline"
                  onClick={() => {
                    setShowPaymentModal(false);
                    clearCart();
                    setCreatedOrder(null);
                    setOrderItemsSnapshot([]);
                    setSelectedPaymentMode(null);
                    setTableNumber("");
                    setOrderNotes("");
                  }}
                  data-testid="button-done"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Success Modal - Shows after order is placed */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-lg max-w-[95vw] mx-auto max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex justify-center mb-3">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 animate-pulse">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl font-bold text-green-700 dark:text-green-400">
              Order Placed Successfully!
            </DialogTitle>
            <DialogDescription className="text-center text-base">
              Thank you for your order, {customerInfo.name.split(" ")[0]}!
            </DialogDescription>
          </DialogHeader>
          
          {createdOrder && orderItemsSnapshot.length > 0 && (
            <ScrollArea className="flex-1 max-h-[50vh] pr-4">
              <div className="space-y-4">
                {/* Order Summary Card */}
                <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-950/30 dark:to-background border-green-200 dark:border-green-800">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Order Number</span>
                      <span className="font-bold text-lg">#{createdOrder.orderNumber || createdOrder.id.slice(-8).toUpperCase()}</span>
                    </div>
                    {tableNumber && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Table / Token</span>
                        <Badge variant="outline">{tableNumber}</Badge>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Phone</span>
                      <span className="font-medium">{customerInfo.phone}</span>
                    </div>
                    {customerInfo.address && (
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-muted-foreground">Delivery Address</span>
                        <span className="font-medium text-right max-w-[60%]">{customerInfo.address}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Pin Code</span>
                      <span className="font-medium">{customerInfo.pinCode}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Order Items */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-base">Your Order</h3>
                  <Card>
                    <CardContent className="p-3 space-y-2">
                      {orderItemsSnapshot.map((item, index) => (
                        <div key={index} className="flex justify-between items-center py-1">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{item.quantity}x</span>
                            <span className="font-medium">{item.name}</span>
                          </div>
                          <span className="text-sm">₹{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* Order Totals */}
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>₹{totalAmount.toFixed(2)}</span>
                    </div>
                    {finalDeliveryCharge > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Delivery Charge</span>
                        <span>₹{finalDeliveryCharge.toFixed(2)}</span>
                      </div>
                    )}
                    {finalDeliveryCharge === 0 && isFreeDelivery && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          Free Delivery
                        </span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-primary">₹{finalTotal.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Order Notes if any */}
                {orderNotes && (
                  <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                    <CardContent className="p-3">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Special Instructions:</p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{orderNotes}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Estimated Time */}
                <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
                      <Clock className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-blue-900 dark:text-blue-100">Estimated Preparation Time</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">15-20 minutes</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Order Status Info */}
                <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />
                    Awaiting Payment
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {selectedPaymentMode === "cash" 
                      ? "Please pay at the counter"
                      : "Complete UPI payment"}
                  </span>
                </div>
              </div>
            </ScrollArea>
          )}
          
          {/* Footer Actions */}
          <div className="flex flex-col gap-2 pt-4 flex-shrink-0">
            <Button 
              className="w-full gap-2 h-12 text-base font-semibold"
              onClick={() => {
                setShowSuccessModal(false);
                setShowPaymentModal(true);
              }}
              data-testid="button-continue-payment"
            >
              <CreditCard className="h-5 w-5" />
              Continue to Payment
            </Button>
            <Button
              variant="outline"
              className="w-full h-10"
              onClick={() => {
                setShowSuccessModal(false);
                clearCart();
                setCreatedOrder(null);
                setOrderItemsSnapshot([]);
                setTableNumber("");
                setOrderNotes("");
              }}
              data-testid="button-success-done"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface MenuItemCardProps {
  item: MenuItem;
  cartItem?: { quantity: number };
  onAdd: () => void;
  onView: () => void;
  onUpdateQuantity: (qty: number) => void;
}

function MenuItemCard({ item, cartItem, onAdd, onView, onUpdateQuantity }: MenuItemCardProps) {
  return (
    <Card 
      className="overflow-hidden hover-elevate cursor-pointer" 
      data-testid={`card-menu-item-${item.id}`}
      onClick={onView}
    >
      <CardContent className="flex gap-4 p-3">
        {item.image && (
          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg">
            <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {item.isVeg ? (
              <div className="flex h-4 w-4 items-center justify-center rounded border-2 border-green-600">
                <div className="h-2 w-2 rounded-full bg-green-600" />
              </div>
            ) : (
              <div className="flex h-4 w-4 items-center justify-center rounded border-2 border-red-600">
                <div className="h-2 w-2 rounded-full bg-red-600" />
              </div>
            )}
            {item.isBestseller && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                Bestseller
              </Badge>
            )}
          </div>
          <h3 className="mt-1 font-semibold truncate">{item.name}</h3>
          {item.description && (
            <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
          )}
          <div className="mt-2 flex items-center justify-between">
            <p className="text-lg font-bold">₹{Number(item.price).toFixed(0)}</p>
            
            {cartItem ? (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={() => onUpdateQuantity(cartItem.quantity - 1)}
                  data-testid={`button-decrease-${item.id}`}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-6 text-center font-medium">{cartItem.quantity}</span>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={() => onUpdateQuantity(cartItem.quantity + 1)}
                  data-testid={`button-increase-${item.id}`}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd();
                }}
                data-testid={`button-add-${item.id}`}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ShopPage() {
  return (
    <CartProvider>
      <ShopPageContent />
    </CartProvider>
  );
}
