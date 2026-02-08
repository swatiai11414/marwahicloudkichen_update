import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  CheckCircle2, 
  XCircle, 
  Clock,
  RotateCcw,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { StoreStatusResponse } from "@shared/schema";

export function StoreStatusToggle() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [storeStatus, setStoreStatus] = useState<StoreStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current store status
  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/availability/status");
      if (!res.ok) throw new Error("Failed to fetch status");
      const data = await res.json();
      setStoreStatus(data);
    } catch (error) {
      console.error("Error fetching store status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Toggle mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ manualOverride, reason }: { manualOverride: string; reason?: string }) => {
      const res = await apiRequest("PUT", "/api/admin/availability/toggle", {
        manualOverride,
        overrideReason: reason,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/availability/status"] });
      setStoreStatus(data.availability);
      toast({
        title: data.message,
        variant: data.availability?.manualOverride === "force_close" ? "destructive" : "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const handleForceOpen = () => {
    toggleMutation.mutate({ 
      manualOverride: "force_open", 
      reason: "Opened by admin" 
    });
  };

  const handleForceClose = () => {
    toggleMutation.mutate({ 
      manualOverride: "force_close", 
      reason: "Closed by admin" 
    });
  };

  const handleReset = () => {
    toggleMutation.mutate({ 
      manualOverride: "none", 
      reason: "Normal hours restored" 
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Store Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isOpen = storeStatus?.isOpen ?? false;
  const status = storeStatus?.status ?? "normal";
  const message = storeStatus?.message ?? "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Store Status
          </div>
          {/* Current Status Badge */}
          <Badge 
            className={
              status === "force_open" ? "bg-green-600" :
              status === "force_close" ? "bg-red-600" :
              isOpen ? "bg-green-600" : "bg-gray-600"
            }
          >
            {status === "force_open" && <CheckCircle2 className="mr-1 h-3 w-3" />}
            {status === "force_close" && <XCircle className="mr-1 h-3 w-3" />}
            {status === "force_open" ? "FORCE OPEN" :
             status === "force_close" ? "FORCE CLOSED" :
             isOpen ? "OPEN" : "CLOSED"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status Message */}
        <div className={`rounded-lg p-3 text-sm ${
          status === "force_open" ? "bg-green-50 text-green-700" :
          status === "force_close" ? "bg-red-50 text-red-700" :
          isOpen ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-700"
        }`}>
          <div className="flex items-start gap-2">
            {status === "force_open" && <CheckCircle2 className="h-4 w-4 mt-0.5" />}
            {status === "force_close" && <XCircle className="h-4 w-4 mt-0.5" />}
            {!["force_open", "force_close"].includes(status) && isOpen && <CheckCircle2 className="h-4 w-4 mt-0.5" />}
            {!["force_open", "force_close"].includes(status) && !isOpen && <Clock className="h-4 w-4 mt-0.5" />}
            <div>
              <p className="font-medium">{message}</p>
              <p className="text-xs opacity-75 mt-1">
                Regular hours: {storeStatus?.openingTime} - {storeStatus?.closingTime}
              </p>
            </div>
          </div>
        </div>

        {/* Timing Info */}
        <div className="text-sm text-muted-foreground">
          <p>Operating Hours: {storeStatus?.openingTime} - {storeStatus?.closingTime}</p>
          <p>Timezone: {storeStatus?.timezone}</p>
        </div>

        {/* Action Buttons */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Button
            onClick={handleForceOpen}
            disabled={toggleMutation.isPending || status === "force_open"}
            className="bg-green-600 hover:bg-green-700"
            variant={status === "force_open" ? "default" : "outline"}
          >
            {toggleMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Force Open
              </>
            )}
          </Button>
          
          <Button
            onClick={handleForceClose}
            disabled={toggleMutation.isPending || status === "force_close"}
            variant={status === "force_close" ? "default" : "destructive"}
          >
            {toggleMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Force Close
              </>
            )}
          </Button>
          
          <Button
            onClick={handleReset}
            disabled={toggleMutation.isPending || status === "normal"}
            variant="outline"
          >
            {toggleMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </>
            )}
          </Button>
        </div>

        {/* Info Box */}
        <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>
            <strong>Quick Actions:</strong> Use these buttons to immediately open or close 
            your store, regardless of regular operating hours. "Reset" returns to normal timing.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
