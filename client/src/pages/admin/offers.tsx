import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, Gift, Calendar, Percent, DollarSign } from "lucide-react";
import type { Offer } from "@shared/schema";

export default function AdminOffers() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);

  const { data: offers, isLoading } = useQuery<Offer[]>({
    queryKey: ["/api/admin/offers"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { shopId?: string; title: string; description?: string; discountType: string; discountValue: string; minVisits?: number; minOrderAmount?: string; expiryDate?: Date | string; isActive?: boolean }) =>
      apiRequest("POST", "/api/admin/offers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offers"] });
      setDialogOpen(false);
      setEditingOffer(null);
      toast({ title: "Offer created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create offer", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Offer> }) =>
      apiRequest("PATCH", `/api/admin/offers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offers"] });
      setDialogOpen(false);
      setEditingOffer(null);
      toast({ title: "Offer updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update offer", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/offers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offers"] });
      toast({ title: "Offer deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete offer", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/offers/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offers"] });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const offerData = {
      title: formData.get("title") as string,
      description: formData.get("description") as string || undefined,
      discountType: formData.get("discountType") as string,
      discountValue: formData.get("discountValue") as string,
      minVisits: parseInt(formData.get("minVisits") as string) || 0,
      minOrderAmount: formData.get("minOrderAmount") as string || undefined,
      expiryDate: formData.get("expiryDate")
        ? new Date(formData.get("expiryDate") as string)
        : undefined,
      isActive: formData.get("isActive") === "on",
    };

    if (editingOffer) {
      updateMutation.mutate({ id: editingOffer.id, data: offerData });
    } else {
      createMutation.mutate(offerData);
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "No expiry";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isExpired = (date: Date | string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Offers & Promotions</h1>
            <p className="text-muted-foreground">
              Create and manage special offers for your customers
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingOffer(null)} data-testid="button-add-offer">
                <Plus className="mr-2 h-4 w-4" />
                Create Offer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingOffer ? "Edit Offer" : "Create New Offer"}
                </DialogTitle>
                <DialogDescription>
                  Set up a promotional offer for your customers
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="max-h-[60vh] space-y-4 overflow-y-auto py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Offer Title</Label>
                    <Input
                      id="title"
                      name="title"
                      defaultValue={editingOffer?.title || ""}
                      placeholder="e.g., Weekend Special"
                      required
                      data-testid="input-offer-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={editingOffer?.description || ""}
                      placeholder="Describe your offer"
                      data-testid="input-offer-description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="discountType">Discount Type</Label>
                      <Select
                        name="discountType"
                        defaultValue={editingOffer?.discountType || "percentage"}
                      >
                        <SelectTrigger data-testid="select-discount-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="discountValue">Discount Value</Label>
                      <Input
                        id="discountValue"
                        name="discountValue"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={editingOffer?.discountValue || ""}
                        placeholder="10"
                        required
                        data-testid="input-discount-value"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minVisits">Min. Visits Required</Label>
                      <Input
                        id="minVisits"
                        name="minVisits"
                        type="number"
                        min="0"
                        defaultValue={editingOffer?.minVisits || "0"}
                        data-testid="input-min-visits"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minOrderAmount">Min. Order Amount</Label>
                      <Input
                        id="minOrderAmount"
                        name="minOrderAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={editingOffer?.minOrderAmount || ""}
                        placeholder="Optional"
                        data-testid="input-min-order"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input
                      id="expiryDate"
                      name="expiryDate"
                      type="date"
                      defaultValue={
                        editingOffer?.expiryDate
                          ? new Date(editingOffer.expiryDate).toISOString().split("T")[0]
                          : ""
                      }
                      data-testid="input-expiry-date"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="isActive"
                      name="isActive"
                      defaultChecked={editingOffer?.isActive ?? true}
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" data-testid="button-save-offer">
                    {editingOffer ? "Update" : "Create"} Offer
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : offers && offers.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => (
              <Card
                key={offer.id}
                className={!offer.isActive || isExpired(offer.expiryDate) ? "opacity-60" : ""}
                data-testid={`offer-card-${offer.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        {offer.discountType === "percentage" ? (
                          <Percent className="h-5 w-5 text-primary" />
                        ) : (
                          <DollarSign className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base">{offer.title}</CardTitle>
                        <CardDescription>
                          {offer.discountType === "percentage"
                            ? `${offer.discountValue}% off`
                            : `₹${offer.discountValue} off`}
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={offer.isActive ?? false}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: offer.id, isActive: checked })
                      }
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {offer.description && (
                    <p className="mb-3 text-sm text-muted-foreground">
                      {offer.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {offer.minVisits ? (
                      <Badge variant="outline">Min {offer.minVisits} visits</Badge>
                    ) : null}
                    {offer.minOrderAmount && (
                      <Badge variant="outline">Min ₹{offer.minOrderAmount}</Badge>
                    )}
                    <Badge
                      variant={isExpired(offer.expiryDate) ? "destructive" : "secondary"}
                      className="flex items-center gap-1"
                    >
                      <Calendar className="h-3 w-3" />
                      {formatDate(offer.expiryDate)}
                    </Badge>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingOffer(offer);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="mr-1 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(offer.id)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Gift className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">No offers yet</h3>
              <p className="text-sm text-muted-foreground">
                Create your first promotional offer to attract customers
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
