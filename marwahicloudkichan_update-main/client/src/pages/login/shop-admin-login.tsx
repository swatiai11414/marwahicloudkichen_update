import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Store, Eye, EyeOff } from "lucide-react";
import type { Shop } from "@shared/schema";

export default function ShopAdminLogin() {
  const [selectedShop, setSelectedShop] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const locationData = useLocation();
  const location = Array.isArray(locationData) ? locationData[0] : locationData;
  const setLocation = Array.isArray(locationData) ? locationData[1] : () => {};
  const { toast } = useToast();

  const { data: shops = [], isLoading: shopsLoading } = useQuery<Shop[]>({
    queryKey: ["/api/shops/list"],
  });

  // Auto-select shop from URL query parameter
  useEffect(() => {
    if (shops.length > 0 && !selectedShop && location) {
      try {
        // location from wouter is just the pathname + search + hash
        // e.g., "/login/shop-admin?slug=pizza-hut"
        const searchIndex = location.indexOf('?');
        if (searchIndex !== -1) {
          const searchString = location.substring(searchIndex + 1);
          const params = new URLSearchParams(searchString);
          const slugParam = params.get("slug");
          if (slugParam) {
            const matchedShop = shops.find(shop => shop.slug === slugParam);
            if (matchedShop) {
              setSelectedShop(matchedShop.id);
            }
          }
        }
      } catch (error) {
        console.error("Error parsing URL params:", error);
      }
    }
  }, [shops, location, selectedShop]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShop) {
      toast({ title: "Error", description: "Please select a shop", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/shop-admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId: selectedShop, password }),
      });

      if (res.ok) {
        toast({ title: "Login successful", description: "Welcome to your shop dashboard!" });
        setLocation("/admin");
      } else {
        const data = await res.json();
        toast({ 
          title: "Login failed", 
          description: data.message || "Invalid password",
          variant: "destructive" 
        });
      }
    } catch {
      toast({ 
        title: "Error", 
        description: "Something went wrong",
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Shop Admin Login</CardTitle>
          <CardDescription>Select your shop and enter the password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shop">Select Shop</Label>
              <Select value={selectedShop} onValueChange={setSelectedShop}>
                <SelectTrigger data-testid="select-shop">
                  <SelectValue placeholder={shopsLoading ? "Loading shops..." : "Choose your shop"} />
                </SelectTrigger>
                <SelectContent>
                  {shops.map((shop) => (
                    <SelectItem key={shop.id} value={shop.id} data-testid={`shop-option-${shop.slug}`}>
                      {shop.shopName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter shop password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-shop-password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !selectedShop}
              data-testid="button-shop-login"
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
          <div className="mt-6 text-center space-y-2">
            <a href="/login/super-admin" className="block text-sm text-muted-foreground hover:text-primary">
              Super Admin Login
            </a>
            <a href="/" className="block text-sm text-muted-foreground hover:text-primary">
              Back to Home
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
