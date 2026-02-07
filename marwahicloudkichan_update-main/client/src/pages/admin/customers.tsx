import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { Search, Users, Phone, Calendar, TrendingUp, Smartphone, Monitor, Tablet, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Customer } from "@shared/schema";

export default function AdminCustomers() {
  const [search, setSearch] = useState("");

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/admin/customers"],
  });

  const filteredCustomers = customers?.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDeviceIcon = (deviceType: string | null) => {
    if (!deviceType) return <Monitor className="h-3 w-3" />;
    const type = deviceType.toLowerCase();
    if (type.includes("mobile") || type.includes("phone")) return <Smartphone className="h-3 w-3" />;
    if (type.includes("tablet")) return <Tablet className="h-3 w-3" />;
    return <Monitor className="h-3 w-3" />;
  };

  const exportToCSV = () => {
    if (!customers || customers.length === 0) return;
    
    const headers = [
      "Name", "Phone", "Email", "City", "Total Visits", "Total Orders", 
      "Total Spent", "Avg Bill", "Device Type", "OS", "Browser", 
      "Screen Size", "Language", "First Visit", "Last Visit", "Last Order"
    ];
    
    const rows = customers.map(c => [
      c.name,
      c.phone,
      c.email || "",
      c.city || "",
      c.totalVisits,
      c.totalOrders,
      c.totalSpent,
      c.avgBill,
      c.deviceType || "",
      c.os || "",
      c.browser || "",
      c.screenWidth && c.screenHeight ? `${c.screenWidth}x${c.screenHeight}` : "",
      c.language || "",
      c.firstVisit ? new Date(c.firstVisit).toISOString() : "",
      c.lastVisit ? new Date(c.lastVisit).toISOString() : "",
      c.lastOrderAt ? new Date(c.lastOrderAt).toISOString() : ""
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `customers_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Customers</h1>
            <p className="text-muted-foreground">
              View and manage your customer database
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-customers"
              />
            </div>
            <Button 
              variant="outline" 
              onClick={exportToCSV}
              disabled={!customers || customers.length === 0}
              data-testid="button-export-customers"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Customers
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customers?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Repeat Customers
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {customers?.filter((c) => c.totalVisits > 1).length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredCustomers && filteredCustomers.length > 0 ? (
          <div className="space-y-3">
            {filteredCustomers.map((customer) => (
              <Card key={customer.id} data-testid={`customer-row-${customer.id}`}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar>
                    <AvatarFallback>
                      {customer.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{customer.name}</p>
                      {customer.totalVisits > 5 && (
                        <Badge variant="secondary" className="shrink-0">
                          Loyal
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {customer.phone}
                      </span>
                      {customer.city && (
                        <span>{customer.city}</span>
                      )}
                    </div>
                    {(customer.deviceType || customer.os || customer.browser) && (
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {getDeviceIcon(customer.deviceType)}
                          {customer.deviceType || "Unknown"}
                        </span>
                        {customer.os && (
                          <span className="px-1.5 py-0.5 bg-muted rounded">
                            {customer.os}
                          </span>
                        )}
                        {customer.browser && (
                          <span className="px-1.5 py-0.5 bg-muted rounded">
                            {customer.browser}
                          </span>
                        )}
                        {customer.screenWidth && customer.screenHeight && (
                          <span className="text-muted-foreground/70">
                            {customer.screenWidth}x{customer.screenHeight}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="hidden text-right sm:block">
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span>First: {formatDate(customer.firstVisit)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <span>Last: {formatDate(customer.lastVisit)}</span>
                    </div>
                    {customer.totalOrders > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {customer.totalOrders} orders | Avg: ₹{Number(customer.avgBill).toFixed(0)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 items-end shrink-0">
                    <Badge variant="outline">
                      {customer.totalVisits} visit{customer.totalVisits !== 1 ? "s" : ""}
                    </Badge>
                    {Number(customer.totalSpent) > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        ₹{Number(customer.totalSpent).toFixed(0)} spent
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">No customers yet</h3>
              <p className="text-sm text-muted-foreground">
                {search
                  ? "No customers match your search"
                  : "Customers will appear here when they place orders"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
