import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Star, StarOff, Save, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DeliveryReason {
  id: string;
  reason: string;
  isDefault: boolean;
  isActive: boolean;
}

interface DeliverySettings {
  deliveryCharge: string;
  deliveryChargeReason: string | null;
  freeDeliveryThreshold: string | null;
  reasons: DeliveryReason[];
}

export function DeliveryChargeSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newReason, setNewReason] = useState("");
  const [isAddingReason, setIsAddingReason] = useState(false);

  // Form state
  const [deliveryCharge, setDeliveryCharge] = useState("0");
  const [deliveryChargeReason, setDeliveryChargeReason] = useState("");
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState("");

  // Fetch delivery settings
  const { data, isLoading } = useQuery<DeliverySettings>({
    queryKey: ["/api/admin/delivery-settings"],
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { 
      deliveryCharge: number; 
      deliveryChargeReason: string | null;
      freeDeliveryThreshold: number | null;
    }) => {
      await apiRequest("PATCH", "/api/admin/delivery-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/delivery-settings"] });
      toast({
        title: "Delivery settings updated",
        description: "Your delivery charge settings have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update delivery settings.",
        variant: "destructive",
      });
    },
  });

  // Create reason mutation
  const createReasonMutation = useMutation({
    mutationFn: async (reason: { reason: string; isDefault: boolean }) => {
      await apiRequest("POST", "/api/admin/delivery-reasons", reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/delivery-settings"] });
      setNewReason("");
      setIsAddingReason(false);
      toast({
        title: "Reason added",
        description: "Delivery charge reason has been added.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add reason.",
        variant: "destructive",
      });
    },
  });

  // Delete reason mutation
  const deleteReasonMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/delivery-reasons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/delivery-settings"] });
      toast({
        title: "Reason deleted",
        description: "Delivery charge reason has been deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete reason.",
        variant: "destructive",
      });
    },
  });

  // Set default reason mutation
  const setDefaultReasonMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/admin/delivery-reasons/${id}/set-default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/delivery-settings"] });
      toast({
        title: "Default reason updated",
        description: "Default delivery charge reason has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to set default reason.",
        variant: "destructive",
      });
    },
  });

  // Initialize form with fetched data
  React.useEffect(() => {
    if (data) {
      setDeliveryCharge(data.deliveryCharge || "0");
      setDeliveryChargeReason(data.deliveryChargeReason || "");
      setFreeDeliveryThreshold(data.freeDeliveryThreshold || "");
    }
  }, [data]);

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      deliveryCharge: parseFloat(deliveryCharge) || 0,
      deliveryChargeReason: deliveryChargeReason || null,
      freeDeliveryThreshold: freeDeliveryThreshold ? parseFloat(freeDeliveryThreshold) : null,
    });
  };

  const handleAddReason = () => {
    if (newReason.trim()) {
      createReasonMutation.mutate({
        reason: newReason.trim(),
        isDefault: data?.reasons.length === 0, // First reason is default
      });
    }
  };

  const activeReasons = data?.reasons?.filter(r => r.isActive) || [];
  const inactiveReasons = data?.reasons?.filter(r => !r.isActive) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Delivery Charge Settings</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Delivery Charge Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Delivery Charge Settings
          </CardTitle>
          <CardDescription>
            Configure delivery charges and thresholds for your shop
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="deliveryCharge">Standard Delivery Charge (₹)</Label>
              <Input
                id="deliveryCharge"
                type="number"
                step="0.01"
                min="0"
                value={deliveryCharge}
                onChange={(e) => setDeliveryCharge(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                This charge applies to all delivery orders
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="freeDeliveryThreshold">Free Delivery Threshold (₹)</Label>
              <Input
                id="freeDeliveryThreshold"
                type="number"
                step="0.01"
                min="0"
                value={freeDeliveryThreshold}
                onChange={(e) => setFreeDeliveryThreshold(e.target.value)}
                placeholder="Leave empty for no free delivery"
              />
              <p className="text-xs text-muted-foreground">
                Orders above this amount get free delivery
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryChargeReason">Default Delivery Reason</Label>
            <Input
              id="deliveryChargeReason"
              value={deliveryChargeReason}
              onChange={(e) => setDeliveryChargeReason(e.target.value)}
              placeholder="e.g., Standard delivery within 5km"
            />
            <p className="text-xs text-muted-foreground">
              Reason shown to customers when delivery charge applies
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSaveSettings}
              disabled={updateSettingsMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Charge Reasons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Delivery Charge Reasons
          </CardTitle>
          <CardDescription>
            Manage different reasons for delivery charges (e.g., distance-based, express delivery)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Reason */}
          {isAddingReason ? (
            <div className="rounded-lg border p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newReason">New Reason</Label>
                <Input
                  id="newReason"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="e.g., Delivery within 3km"
                  maxLength={255}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddReason}
                  disabled={!newReason.trim() || createReasonMutation.isPending}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Reason
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsAddingReason(false);
                    setNewReason("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setIsAddingReason(true)}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Delivery Charge Reason
            </Button>
          )}

          {/* Reasons List */}
          {activeReasons.length > 0 && (
            <div className="space-y-2">
              <Label>Active Reasons</Label>
              <div className="divide-y rounded-lg border">
                {activeReasons.map((reason) => (
                  <div
                    key={reason.id}
                    className="flex items-center justify-between gap-4 p-3"
                  >
                    <div className="flex items-center gap-3">
                      {reason.isDefault ? (
                        <Star className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <button
                          onClick={() => setDefaultReasonMutation.mutate(reason.id)}
                          className="text-gray-400 hover:text-yellow-500"
                          title="Set as default"
                        >
                          <StarOff className="h-4 w-4" />
                        </button>
                      )}
                      <span className={reason.isDefault ? "font-medium" : ""}>
                        {reason.reason}
                      </span>
                      {reason.isDefault && (
                        <span className="text-xs text-muted-foreground">(Default)</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteReasonMutation.mutate(reason.id)}
                      disabled={activeReasons.length === 1}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeReasons.length === 0 && !isAddingReason && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No delivery charge reasons added yet.</p>
              <p className="text-sm">Add reasons to show customers why delivery charges apply.</p>
            </div>
          )}

          {/* Inactive Reasons */}
          {inactiveReasons.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Inactive Reasons</Label>
              <div className="divide-y rounded-lg border bg-gray-50">
                {inactiveReasons.map((reason) => (
                  <div
                    key={reason.id}
                    className="flex items-center justify-between gap-4 p-3 opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      <span>{reason.reason}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Reactivate reason
                        apiRequest("PATCH", `/api/admin/delivery-reasons/${reason.id}`, { isActive: true });
                        queryClient.invalidateQueries({ queryKey: ["/api/admin/delivery-settings"] });
                      }}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Card */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Standard Delivery:</span>
              <span className="font-medium">₹{parseFloat(deliveryCharge || "0").toFixed(2)}</span>
            </div>
            {freeDeliveryThreshold && parseFloat(freeDeliveryThreshold) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Free Delivery:</span>
                <span className="font-medium">Orders above ₹{parseFloat(freeDeliveryThreshold).toFixed(2)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for using delivery settings
export function useDeliverySettings() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<DeliverySettings>({
    queryKey: ["/api/admin/delivery-settings"],
  });

  const updateSettings = async (settings: {
    deliveryCharge: number;
    deliveryChargeReason: string | null;
    freeDeliveryThreshold: number | null;
  }) => {
    await apiRequest("PATCH", "/api/admin/delivery-settings", settings);
    queryClient.invalidateQueries({ queryKey: ["/api/admin/delivery-settings"] });
  };

  return {
    settings: data,
    isLoading,
    error,
    updateSettings,
  };
}
