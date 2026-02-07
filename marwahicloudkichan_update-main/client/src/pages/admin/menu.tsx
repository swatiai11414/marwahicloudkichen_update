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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Plus, Pencil, Trash2, Star, Leaf, GripVertical } from "lucide-react";
import { ImageUploadWithCrop } from "@/components/image-cropper";
import type { MenuItem, MenuCategory } from "@shared/schema";

interface MenuData {
  categories: MenuCategory[];
  items: MenuItem[];
}

export default function AdminMenu() {
  const { toast } = useToast();
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

  const handleImageUpload = async (blob: Blob): Promise<string> => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", blob, "cropped-image.jpg");
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      
      if (!response.ok) throw new Error("Upload failed");
      
      const data = await response.json();
      toast({ title: "Image uploaded successfully" });
      return data.url;
    } catch {
      toast({ title: "Failed to upload image", variant: "destructive" });
      throw new Error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const { data, isLoading } = useQuery<MenuData>({
    queryKey: ["/api/admin/menu"],
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data: { name: string }) =>
      apiRequest("POST", "/api/admin/categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menu"] });
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      toast({ title: "Category created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create category", variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MenuCategory> }) =>
      apiRequest("PATCH", `/api/admin/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menu"] });
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      toast({ title: "Category updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update category", variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menu"] });
      toast({ title: "Category deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete category", variant: "destructive" });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: (data: Partial<MenuItem>) =>
      apiRequest("POST", "/api/admin/items", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menu"] });
      setItemDialogOpen(false);
      setEditingItem(null);
      toast({ title: "Menu item created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create menu item", variant: "destructive" });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MenuItem> }) =>
      apiRequest("PATCH", `/api/admin/items/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menu"] });
      setItemDialogOpen(false);
      setEditingItem(null);
      toast({ title: "Menu item updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update menu item", variant: "destructive" });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menu"] });
      toast({ title: "Menu item deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete menu item", variant: "destructive" });
    },
  });

  const toggleItemAvailability = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      apiRequest("PATCH", `/api/admin/items/${id}`, { isAvailable }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menu"] });
    },
  });

  const handleCategorySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;

    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data: { name } });
    } else {
      createCategoryMutation.mutate({ name });
    }
  };

  const handleItemSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const itemData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string || undefined,
      price: formData.get("price") as string,
      categoryId: selectedCategoryId || undefined,
      image: imageUrl || undefined,
      isVeg: formData.get("isVeg") === "on",
      isBestseller: formData.get("isBestseller") === "on",
      isAvailable: formData.get("isAvailable") === "on",
    };

    if (editingItem) {
      updateItemMutation.mutate({ id: editingItem.id, data: itemData });
    } else {
      createItemMutation.mutate(itemData);
    }
    setImageUrl("");
    setSelectedCategoryId("");
  };

  const openItemDialog = (item: MenuItem | null) => {
    setEditingItem(item);
    setImageUrl(item?.image || "");
    setSelectedCategoryId(item?.categoryId || "");
    setItemDialogOpen(true);
  };

  const getItemsByCategory = (categoryId: string | null) =>
    data?.items.filter((item) =>
      categoryId === null ? !item.categoryId : item.categoryId === categoryId
    ) || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Menu Management</h1>
            <p className="text-muted-foreground">
              Add and manage your menu items and categories
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => setEditingCategory(null)} data-testid="button-add-category">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? "Edit Category" : "Add Category"}
                  </DialogTitle>
                  <DialogDescription>
                    Categories help organize your menu items
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCategorySubmit}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Category Name</Label>
                      <Input
                        id="name"
                        name="name"
                        defaultValue={editingCategory?.name || ""}
                        placeholder="e.g., Starters, Main Course"
                        required
                        data-testid="input-category-name"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" data-testid="button-save-category">
                      {editingCategory ? "Update" : "Create"} Category
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openItemDialog(null)} data-testid="button-add-item">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? "Edit Menu Item" : "Add Menu Item"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleItemSubmit}>
                  <div className="max-h-[60vh] space-y-4 overflow-y-auto py-4">
                    <div className="space-y-2">
                      <Label htmlFor="itemName">Item Name</Label>
                      <Input
                        id="itemName"
                        name="name"
                        defaultValue={editingItem?.name || ""}
                        placeholder="e.g., Margherita Pizza"
                        required
                        data-testid="input-item-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        name="description"
                        defaultValue={editingItem?.description || ""}
                        placeholder="A short description of the item"
                        data-testid="input-item-description"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="price">Price (₹)</Label>
                        <Input
                          id="price"
                          name="price"
                          type="number"
                          step="0.01"
                          min="0"
                          defaultValue={editingItem?.price || ""}
                          placeholder="0.00"
                          required
                          data-testid="input-item-price"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="categoryId">Category</Label>
                        <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                          <SelectTrigger data-testid="select-item-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {data?.categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Item Image</Label>
                      <ImageUploadWithCrop
                        imageUrl={imageUrl}
                        onImageChange={setImageUrl}
                        onUpload={handleImageUpload}
                        isUploading={isUploading}
                        defaultPreset="square"
                      />
                    </div>
                    <div className="flex flex-wrap gap-6">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="isVeg"
                          name="isVeg"
                          defaultChecked={editingItem?.isVeg || false}
                        />
                        <Label htmlFor="isVeg" className="flex items-center gap-1">
                          <Leaf className="h-4 w-4 text-green-600" />
                          Vegetarian
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="isBestseller"
                          name="isBestseller"
                          defaultChecked={editingItem?.isBestseller || false}
                        />
                        <Label htmlFor="isBestseller" className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          Bestseller
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="isAvailable"
                          name="isAvailable"
                          defaultChecked={editingItem?.isAvailable ?? true}
                        />
                        <Label htmlFor="isAvailable">Available</Label>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" data-testid="button-save-item">
                      {editingItem ? "Update" : "Create"} Item
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Tabs defaultValue={data?.categories[0]?.id || "uncategorized"}>
            <TabsList className="mb-4 flex-wrap">
              {data?.categories.map((category) => (
                <TabsTrigger key={category.id} value={category.id}>
                  {category.name} ({getItemsByCategory(category.id).length})
                </TabsTrigger>
              ))}
              {getItemsByCategory(null).length > 0 && (
                <TabsTrigger value="uncategorized">
                  Uncategorized ({getItemsByCategory(null).length})
                </TabsTrigger>
              )}
            </TabsList>

            {data?.categories.map((category) => (
              <TabsContent key={category.id} value={category.id}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div>
                      <CardTitle>{category.name}</CardTitle>
                      <CardDescription>
                        {getItemsByCategory(category.id).length} items
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingCategory(category);
                          setCategoryDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteCategoryMutation.mutate(category.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {getItemsByCategory(category.id).map((item) => (
                        <MenuItemRow
                          key={item.id}
                          item={item}
                          onEdit={() => openItemDialog(item)}
                          onDelete={() => deleteItemMutation.mutate(item.id)}
                          onToggleAvailability={(available) =>
                            toggleItemAvailability.mutate({
                              id: item.id,
                              isAvailable: available,
                            })
                          }
                        />
                      ))}
                      {getItemsByCategory(category.id).length === 0 && (
                        <p className="py-8 text-center text-muted-foreground">
                          No items in this category. Add your first item!
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}

            {getItemsByCategory(null).length > 0 && (
              <TabsContent value="uncategorized">
                <Card>
                  <CardHeader>
                    <CardTitle>Uncategorized Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {getItemsByCategory(null).map((item) => (
                        <MenuItemRow
                          key={item.id}
                          item={item}
                          onEdit={() => openItemDialog(item)}
                          onDelete={() => deleteItemMutation.mutate(item.id)}
                          onToggleAvailability={(available) =>
                            toggleItemAvailability.mutate({
                              id: item.id,
                              isAvailable: available,
                            })
                          }
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </AdminLayout>
  );
}

function MenuItemRow({
  item,
  onEdit,
  onDelete,
  onToggleAvailability,
}: {
  item: MenuItem;
  onEdit: () => void;
  onDelete: () => void;
  onToggleAvailability: (available: boolean) => void;
}) {
  return (
    <div
      className="flex items-center gap-4 rounded-lg border border-border p-3"
      data-testid={`menu-item-row-${item.id}`}
    >
      <GripVertical className="h-5 w-5 cursor-move text-muted-foreground" />
      
      {item.image && (
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
          <img src={item.image} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{item.name}</p>
          {item.isVeg && <Leaf className="h-4 w-4 shrink-0 text-green-600" />}
          {item.isBestseller && <Star className="h-4 w-4 shrink-0 fill-yellow-400 text-yellow-400" />}
        </div>
        <p className="text-sm text-muted-foreground">₹{Number(item.price).toFixed(2)}</p>
      </div>

      <Badge variant={item.isAvailable ? "secondary" : "outline"}>
        {item.isAvailable ? "Available" : "Unavailable"}
      </Badge>

      <Switch
        checked={item.isAvailable ?? false}
        onCheckedChange={onToggleAvailability}
      />

      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
