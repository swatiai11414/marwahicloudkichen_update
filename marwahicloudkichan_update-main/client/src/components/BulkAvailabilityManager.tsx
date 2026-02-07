import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Clock, 
  Globe, 
  Calendar,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Power
} from "lucide-react";
import { TIMEZONES } from "@/lib/availability";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

const bulkAvailabilitySchema = z.object({
  openingTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  closingTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  timezone: z.string().min(1, "Timezone is required"),
  overrideReason: z.string().optional(),
});

type BulkAvailabilityFormData = z.infer<typeof bulkAvailabilitySchema>;

interface ShopAvailability {
  shopId: string;
  shopName: string;
  availability: {
    id: string;
    shopId: string;
    openingTime: string;
    closingTime: string;
    timezone: string;
    manualOverride: string;
    overrideReason: string | null;
  } | null;
  holidays: Array<{
    id: string;
    holidayDate: string;
    name: string;
  }>;
}

export function BulkAvailabilityManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedShops, setSelectedShops] = useState<Set<string>>(new Set());
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayName, setNewHolidayName] = useState("");

  // Form for bulk availability
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BulkAvailabilityFormData>({
    resolver: zodResolver(bulkAvailabilitySchema),
    defaultValues: {
      openingTime: "09:00",
      closingTime: "22:00",
      timezone: "Asia/Kolkata",
    },
  });

  // Fetch all shops availability
  const { data: shopsAvailability, isLoading } = useQuery<ShopAvailability[]>({
    queryKey: ["/api/super-admin/availability/all"],
    queryFn: async () => {
      const res = await fetch("/api/super-admin/availability/all");
      if (!res.ok) throw new Error("Failed to fetch availability");
      return res.json();
    },
  });

  // Single shop update mutation
  const singleShopUpdateMutation = useMutation({
    mutationFn: async ({ shopId, manualOverride, reason }: { shopId: string; manualOverride: string; reason?: string }) => {
      const res = await apiRequest("PUT", `/api/super-admin/shops/${shopId}/availability`, {
        manualOverride,
        overrideReason: reason || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/availability/all"] });
      toast({
        title: "Status Updated",
        description: "Shop status has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update shop status",
        variant: "destructive",
      });
    },
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async (data: BulkAvailabilityFormData) => {
      const res = await apiRequest("PUT", "/api/super-admin/availability/bulk", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/availability/all"] });
      toast({
        title: "Settings Applied",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to apply settings",
        variant: "destructive",
      });
    },
  });

  // Bulk add holidays mutation
  const bulkAddHolidaysMutation = useMutation({
    mutationFn: async (holidays: Array<{ holidayDate: string; name: string }>) => {
      const res = await apiRequest("POST", "/api/super-admin/holidays/bulk/all", { holidays });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/availability/all"] });
      setNewHolidayDate("");
      setNewHolidayName("");
      toast({
        title: "Holidays Added",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add holidays",
        variant: "destructive",
      });
    },
  });

  const onSubmitBulk = (data: BulkAvailabilityFormData) => {
    bulkUpdateMutation.mutate(data);
  };

  const handleAddHoliday = () => {
    if (!newHolidayDate || !newHolidayName) {
      toast({
        title: "Error",
        description: "Please enter both date and name",
        variant: "destructive",
      });
      return;
    }
    bulkAddHolidaysMutation.mutate([{ holidayDate: newHolidayDate, name: newHolidayName }]);
  };

  // Selection handlers
  const toggleShopSelection = (shopId: string) => {
    const newSelected = new Set(selectedShops);
    if (newSelected.has(shopId)) {
      newSelected.delete(shopId);
    } else {
      newSelected.add(shopId);
    }
    setSelectedShops(newSelected);
  };

  const selectAllShops = () => {
    if (shopsAvailability) {
      setSelectedShops(new Set(shopsAvailability.map(s => s.shopId)));
    }
  };

  const deselectAllShops = () => {
    setSelectedShops(new Set());
  };

  const openSelectedShops = () => {
    selectedShops.forEach(shopId => {
      singleShopUpdateMutation.mutate({ shopId, manualOverride: "force_open", reason: "Opened by Super Admin" });
    });
    setSelectedShops(new Set());
  };

  const closeSelectedShops = () => {
    selectedShops.forEach(shopId => {
      singleShopUpdateMutation.mutate({ shopId, manualOverride: "force_close", reason: "Closed by Super Admin" });
    });
    setSelectedShops(new Set());
  };

  const resetSelectedShops = () => {
    selectedShops.forEach(shopId => {
      singleShopUpdateMutation.mutate({ shopId, manualOverride: "none", reason: "Normal hours restored" });
    });
    setSelectedShops(new Set());
  };

  // Calculate stats
  const stats = {
    totalShops: shopsAvailability?.length || 0,
    openShops: shopsAvailability?.filter(s => s.availability?.manualOverride === "force_open").length || 0,
    closedShops: shopsAvailability?.filter(s => s.availability?.manualOverride === "force_close").length || 0,
    totalHolidays: shopsAvailability?.reduce((acc, s) => acc + s.holidays.length, 0) || 0,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shops</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalShops}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Force Open</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.openShops}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Force Closed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.closedShops}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Holidays</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHolidays}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Bulk Settings Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Apply to All Shops
            </CardTitle>
            <CardDescription>
              Set operating hours and timezone for all shops at once
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmitBulk)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="openingTime">Opening Time</Label>
                  <Input
                    id="openingTime"
                    type="time"
                    {...register("openingTime")}
                    className="mt-1"
                  />
                  {errors.openingTime && (
                    <p className="mt-1 text-sm text-red-600">{errors.openingTime.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="closingTime">Closing Time</Label>
                  <Input
                    id="closingTime"
                    type="time"
                    {...register("closingTime")}
                    className="mt-1"
                  />
                  {errors.closingTime && (
                    <p className="mt-1 text-sm text-red-600">{errors.closingTime.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <select
                  id="timezone"
                  {...register("timezone")}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
                {errors.timezone && (
                  <p className="mt-1 text-sm text-red-600">{errors.timezone.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="overrideReason">Reason (optional)</Label>
                <Input
                  id="overrideReason"
                  {...register("overrideReason")}
                  placeholder="e.g., Normal hours restored"
                  className="mt-1"
                />
              </div>

              <Button
                type="submit"
                disabled={bulkUpdateMutation.isPending}
                className="w-full"
              >
                {bulkUpdateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Applying to all shops...
                  </>
                ) : (
                  "Apply to All Shops"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Bulk Holiday Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Add Holiday to All Shops
            </CardTitle>
            <CardDescription>
              Add a holiday that will apply to all shops
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="holidayDate">Holiday Date</Label>
              <Input
                id="holidayDate"
                type="date"
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="holidayName">Holiday Name</Label>
              <Input
                id="holidayName"
                type="text"
                placeholder="e.g., Republic Day, Holi"
                value={newHolidayName}
                onChange={(e) => setNewHolidayName(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button
              onClick={handleAddHoliday}
              disabled={bulkAddHolidaysMutation.isPending}
              className="w-full"
              variant="outline"
            >
              {bulkAddHolidaysMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Holiday to All Shops"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Shop Status Overview with Selective Control */}
      <Card>
        <CardHeader>
          <CardTitle>Shop Status Management</CardTitle>
          <CardDescription>
            Select shops and open/close them individually or in bulk
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Selection Actions */}
              {selectedShops.size > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 flex-wrap">
                  <span className="text-sm font-medium text-blue-700">
                    {selectedShops.size} shop(s) selected
                  </span>
                  <div className="flex gap-2 ml-auto flex-wrap">
                    <Button
                      size="sm"
                      onClick={openSelectedShops}
                      disabled={singleShopUpdateMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Power className="mr-1 h-4 w-4" />
                      Open
                    </Button>
                    <Button
                      size="sm"
                      onClick={closeSelectedShops}
                      disabled={singleShopUpdateMutation.isPending}
                      variant="destructive"
                    >
                      <Power className="mr-1 h-4 w-4" />
                      Close
                    </Button>
                    <Button
                      size="sm"
                      onClick={resetSelectedShops}
                      disabled={singleShopUpdateMutation.isPending}
                      variant="outline"
                    >
                      <RefreshCw className="mr-1 h-4 w-4" />
                      Reset
                    </Button>
                  </div>
                </div>
              )}

              {/* Select All / Deselect All */}
              {shopsAvailability && shopsAvailability.length > 0 && (
                <div className="flex items-center gap-2">
                  {selectedShops.size === shopsAvailability.length ? (
                    <Button variant="outline" size="sm" onClick={deselectAllShops}>
                      Deselect All ({shopsAvailability.length})
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={selectAllShops}>
                      Select All ({shopsAvailability.length})
                    </Button>
                  )}
                </div>
              )}

              {/* Shop List */}
              <div className="space-y-3">
                {shopsAvailability?.map((shop) => (
                  <div
                    key={shop.shopId}
                    className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                      selectedShops.has(shop.shopId) ? "border-blue-500 bg-blue-50/50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedShops.has(shop.shopId)}
                        onCheckedChange={() => toggleShopSelection(shop.shopId)}
                        id={`shop-${shop.shopId}`}
                      />
                      <div>
                        <p className="font-medium">{shop.shopName}</p>
                        <p className="text-sm text-muted-foreground">
                          {shop.availability?.openingTime || "09:00"} - {shop.availability?.closingTime || "22:00"}
                          {shop.holidays.length > 0 && (
                            <span className="ml-2 text-orange-600">
                              • {shop.holidays.length} holiday(s)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Status Badge */}
                      {shop.availability?.manualOverride === "force_open" && (
                        <Badge className="bg-green-600">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Open
                        </Badge>
                      )}
                      {shop.availability?.manualOverride === "force_close" && (
                        <Badge variant="destructive">
                          <XCircle className="mr-1 h-3 w-3" />
                          Closed
                        </Badge>
                      )}
                      {(!shop.availability?.manualOverride || shop.availability.manualOverride === "none") && (
                        <Badge variant="secondary">
                          <Clock className="mr-1 h-3 w-3" />
                          Normal
                        </Badge>
                      )}
                      {/* Holiday Badge */}
                      {shop.holidays.length > 0 && (
                        <Badge variant="outline">
                          <Calendar className="mr-1 h-3 w-3" />
                        </Badge>
                      )}
                      {/* Quick Toggle Buttons */}
                      {shop.availability?.manualOverride !== "force_open" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => singleShopUpdateMutation.mutate({ shopId: shop.shopId, manualOverride: "force_open", reason: "Opened by Super Admin" })}
                          disabled={singleShopUpdateMutation.isPending}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <ToggleRight className="h-4 w-4" />
                        </Button>
                      )}
                      {shop.availability?.manualOverride !== "force_close" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => singleShopUpdateMutation.mutate({ shopId: shop.shopId, manualOverride: "force_close", reason: "Closed by Super Admin" })}
                          disabled={singleShopUpdateMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <ToggleLeft className="h-4 w-4" />
                        </Button>
                      )}
                      {shop.availability?.manualOverride && shop.availability.manualOverride !== "none" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => singleShopUpdateMutation.mutate({ shopId: shop.shopId, manualOverride: "none", reason: "Normal hours restored" })}
                          disabled={singleShopUpdateMutation.isPending}
                          className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {shopsAvailability?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No shops found. Create a shop first.
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}