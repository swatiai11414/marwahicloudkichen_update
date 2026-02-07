import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  LayoutDashboard, 
  Utensils, 
  ShoppingCart, 
  Users, 
  Settings, 
  Gift, 
  Building2, 
  BarChart3, 
  Palette,
  LogOut,
  ChevronUp,
  Layers,
  UserCheck
} from "lucide-react";
import type { Shop } from "@shared/schema";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { isSuperAdmin, isShopAdmin, shopId, logout } = useAuth();
  const [location] = useLocation();

  // Fetch shop name for shop admins
  const { data: shopData } = useQuery<{ shop: Shop }>({
    queryKey: ["/api/admin/settings"],
    enabled: isShopAdmin && !!shopId,
  });

  const shopAdminNavItems = [
    { title: "Dashboard", icon: LayoutDashboard, href: "/admin" },
    { title: "Menu", icon: Utensils, href: "/admin/menu" },
    { title: "Orders", icon: ShoppingCart, href: "/admin/orders" },
    { title: "Customers", icon: Users, href: "/admin/customers" },
    { title: "Offers", icon: Gift, href: "/admin/offers" },
    { title: "Page Builder", icon: Layers, href: "/admin/sections" },
    { title: "Settings", icon: Settings, href: "/admin/settings" },
  ];

  const superAdminNavItems = [
    { title: "Dashboard", icon: LayoutDashboard, href: "/super-admin" },
    { title: "Shops", icon: Building2, href: "/super-admin/shops" },
    { title: "Offers", icon: Gift, href: "/super-admin/offers" },
    { title: "Orders", icon: ShoppingCart, href: "/super-admin/orders" },
    { title: "Themes", icon: Palette, href: "/super-admin/themes" },
    { title: "Analytics", icon: BarChart3, href: "/super-admin/analytics" },
    { title: "User Data", icon: Users, href: "/super-admin/user-data" },
  ];

  const navItems = isSuperAdmin ? superAdminNavItems : shopAdminNavItems;
  const basePath = isSuperAdmin ? "/super-admin" : "/admin";
  const displayName = isSuperAdmin ? "Super Admin" : (shopData?.shop?.shopName || "Shop Admin");

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b border-sidebar-border p-4">
            <Link href={basePath} className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Utensils className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold">HDOS</span>
            </Link>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>
                {isSuperAdmin ? "Super Admin" : "Shop Admin"}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={location === item.href}>
                        <Link href={item.href} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s/g, "-")}`}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border">
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      size="lg"
                      className="data-[state=open]:bg-sidebar-accent"
                      data-testid="button-user-menu"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {isSuperAdmin ? "SA" : (shopData?.shop?.shopName?.[0] || "S")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-1 flex-col text-left text-sm">
                        <span className="font-medium">{displayName}</span>
                        <span className="text-xs text-muted-foreground">
                          {isSuperAdmin ? "Super Admin" : "Shop Admin"}
                        </span>
                      </div>
                      <ChevronUp className="h-4 w-4" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="start" className="w-56">
                    {!isSuperAdmin && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/admin/settings">
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem
                      onClick={() => logout()}
                      className="text-destructive focus:text-destructive"
                      data-testid="button-logout"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center justify-between gap-4 border-b border-border bg-background px-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
