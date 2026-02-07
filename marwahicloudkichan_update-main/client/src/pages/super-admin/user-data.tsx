import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Users, Monitor, Smartphone, Globe, AlertCircle, RefreshCw } from "lucide-react";
import type { PageVisit } from "@shared/schema";

export default function SuperAdminUserData() {
  const [pageFilter, setPageFilter] = useState<string>("");
  const [deviceFilter, setDeviceFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (pageFilter) params.append("page", pageFilter);
    if (deviceFilter && deviceFilter !== "all") params.append("deviceType", deviceFilter);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return params.toString();
  };

  const { data: visits = [], isLoading, error, refetch, isFetching } = useQuery<PageVisit[]>({
    queryKey: ["/api/super-admin/user-data", pageFilter, deviceFilter, startDate, endDate],
    queryFn: async () => {
      const queryString = buildQueryString();
      const response = await fetch(`/api/super-admin/user-data${queryString ? `?${queryString}` : ""}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch user data");
      }
      return response.json();
    },
    retry: false,
  });

  const handleExportCSV = () => {
    const queryString = buildQueryString();
    window.open(`/api/super-admin/user-data/export${queryString ? `?${queryString}` : ""}`, "_blank");
  };

  const formatDate = (dateStr: Date | string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDeviceIcon = (deviceType: string | null) => {
    if (deviceType === "Mobile") return <Smartphone className="h-4 w-4" />;
    if (deviceType === "Desktop") return <Monitor className="h-4 w-4" />;
    return <Globe className="h-4 w-4" />;
  };

  const totalVisits = visits?.length || 0;
  const mobileVisits = visits?.filter(v => v.deviceType === "Mobile").length || 0;
  const desktopVisits = visits?.filter(v => v.deviceType === "Desktop").length || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">User Data</h1>
            <p className="text-muted-foreground">
              View visitor tracking data across all pages
            </p>
          </div>
          <Button size="lg" onClick={handleExportCSV} className="bg-green-600 hover:bg-green-700" data-testid="button-export-csv">
            <Download className="mr-2 h-5 w-5" />
            Download CSV
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Visits</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-visits">{totalVisits}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Mobile Visits</CardTitle>
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-mobile-visits">{mobileVisits}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Desktop Visits</CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-desktop-visits">{desktopVisits}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Page</Label>
                <Input
                  placeholder="Search page..."
                  value={pageFilter}
                  onChange={(e) => setPageFilter(e.target.value)}
                  data-testid="input-page-filter"
                />
              </div>
              <div className="space-y-2">
                <Label>Device Type</Label>
                <Select value={deviceFilter} onValueChange={setDeviceFilter}>
                  <SelectTrigger data-testid="select-device-filter">
                    <SelectValue placeholder="All Devices" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Devices</SelectItem>
                    <SelectItem value="Mobile">Mobile</SelectItem>
                    <SelectItem value="Desktop">Desktop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="input-end-date"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg">Visitor Data</CardTitle>
            <Button variant="outline" size="sm" onClick={handleExportCSV} data-testid="button-download-table">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="py-8 text-center" data-testid="text-error">
                <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
                <p className="text-destructive font-medium mb-4">
                  {error instanceof Error ? error.message : "Failed to load data"}
                </p>
                <div className="flex justify-center gap-4">
                  <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                    Retry
                  </Button>
                  <Button onClick={handleExportCSV} className="bg-green-600 hover:bg-green-700">
                    <Download className="mr-2 h-4 w-4" />
                    Download CSV Anyway
                  </Button>
                </div>
              </div>
            ) : visits && visits.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Page</TableHead>
                      <TableHead>Shop ID</TableHead>
                      <TableHead>OS</TableHead>
                      <TableHead>Browser</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>IP Hash</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Visited At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visits.map((visit) => (
                      <TableRow key={visit.id} data-testid={`row-visit-${visit.id}`}>
                        <TableCell className="font-mono text-xs" data-testid={`text-id-${visit.id}`}>
                          {visit.id.slice(-8)}
                        </TableCell>
                        <TableCell data-testid={`text-page-${visit.id}`}>
                          {visit.page}
                        </TableCell>
                        <TableCell className="text-muted-foreground" data-testid={`text-shop-${visit.id}`}>
                          {visit.shopId || "index"}
                        </TableCell>
                        <TableCell data-testid={`text-os-${visit.id}`}>
                          {visit.os || "-"}
                        </TableCell>
                        <TableCell data-testid={`text-browser-${visit.id}`}>
                          {visit.browser || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2" data-testid={`text-device-${visit.id}`}>
                            {getDeviceIcon(visit.deviceType)}
                            {visit.deviceType || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs" data-testid={`text-ip-${visit.id}`}>
                          {visit.ipHash || "-"}
                        </TableCell>
                        <TableCell data-testid={`text-city-${visit.id}`}>
                          {visit.city || "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground" data-testid={`text-date-${visit.id}`}>
                          {formatDate(visit.visitedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground" data-testid="text-no-data">
                No visitor data found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
