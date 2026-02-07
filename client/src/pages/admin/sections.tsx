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
import { 
  Plus, 
  Pencil, 
  Trash2, 
  GripVertical, 
  Eye, 
  EyeOff,
  Image,
  Utensils,
  Gift,
  Info,
  MessageCircle,
  ImageIcon,
  Layout
} from "lucide-react";
import type { ShopSection } from "@shared/schema";

const SECTION_TYPES = [
  { value: "hero", label: "Hero Banner", icon: Image, description: "Large banner at the top" },
  { value: "menu", label: "Menu", icon: Utensils, description: "Display your menu items" },
  { value: "offers", label: "Offers", icon: Gift, description: "Show special promotions" },
  { value: "about", label: "About", icon: Info, description: "Tell your story" },
  { value: "whatsapp", label: "WhatsApp Contact", icon: MessageCircle, description: "Quick contact button" },
  { value: "gallery", label: "Gallery", icon: ImageIcon, description: "Photo gallery" },
];

export default function AdminSections() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<ShopSection | null>(null);

  const { data: sections, isLoading } = useQuery<ShopSection[]>({
    queryKey: ["/api/admin/sections"],
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<ShopSection>) =>
      apiRequest("POST", "/api/admin/sections", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sections"] });
      setDialogOpen(false);
      setEditingSection(null);
      toast({ title: "Section created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create section", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ShopSection> }) =>
      apiRequest("PATCH", `/api/admin/sections/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sections"] });
      setDialogOpen(false);
      setEditingSection(null);
      toast({ title: "Section updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update section", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/sections/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sections"] });
      toast({ title: "Section deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete section", variant: "destructive" });
    },
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: ({ id, isVisible }: { id: string; isVisible: boolean }) =>
      apiRequest("PATCH", `/api/admin/sections/${id}`, { isVisible }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sections"] });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const sectionData = {
      sectionType: formData.get("sectionType") as string,
      title: formData.get("title") as string || undefined,
      description: formData.get("description") as string || undefined,
      imageUrl: formData.get("imageUrl") as string || undefined,
      orderNo: parseInt(formData.get("orderNo") as string) || 0,
      isVisible: formData.get("isVisible") === "on",
    };

    if (editingSection) {
      updateMutation.mutate({ id: editingSection.id, data: sectionData });
    } else {
      createMutation.mutate(sectionData);
    }
  };

  const getSectionTypeInfo = (type: string) =>
    SECTION_TYPES.find((t) => t.value === type) || SECTION_TYPES[0];

  const sortedSections = sections?.sort((a, b) => a.orderNo - b.orderNo) || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Page Builder</h1>
            <p className="text-muted-foreground">
              Customize your shop page layout with sections
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingSection(null)} data-testid="button-add-section">
                <Plus className="mr-2 h-4 w-4" />
                Add Section
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingSection ? "Edit Section" : "Add New Section"}
                </DialogTitle>
                <DialogDescription>
                  Configure how this section appears on your shop page
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="sectionType">Section Type</Label>
                    <Select
                      name="sectionType"
                      defaultValue={editingSection?.sectionType || "hero"}
                    >
                      <SelectTrigger data-testid="select-section-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              <span>{type.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Title (Optional)</Label>
                    <Input
                      id="title"
                      name="title"
                      defaultValue={editingSection?.title || ""}
                      placeholder="Section title"
                      data-testid="input-section-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={editingSection?.description || ""}
                      placeholder="Section description"
                      data-testid="input-section-description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="imageUrl">Image URL (Optional)</Label>
                    <Input
                      id="imageUrl"
                      name="imageUrl"
                      type="url"
                      defaultValue={editingSection?.imageUrl || ""}
                      placeholder="https://example.com/image.jpg"
                      data-testid="input-section-image"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="orderNo">Display Order</Label>
                      <Input
                        id="orderNo"
                        name="orderNo"
                        type="number"
                        min="0"
                        defaultValue={editingSection?.orderNo || sortedSections.length}
                        data-testid="input-section-order"
                      />
                    </div>
                    <div className="flex items-end gap-2 pb-2">
                      <Switch
                        id="isVisible"
                        name="isVisible"
                        defaultChecked={editingSection?.isVisible ?? true}
                      />
                      <Label htmlFor="isVisible">Visible</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" data-testid="button-save-section">
                    {editingSection ? "Update" : "Create"} Section
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sortedSections.length > 0 ? (
          <div className="space-y-3">
            {sortedSections.map((section) => {
              const typeInfo = getSectionTypeInfo(section.sectionType);
              const TypeIcon = typeInfo.icon;
              
              return (
                <Card
                  key={section.id}
                  className={!section.isVisible ? "opacity-60" : ""}
                  data-testid={`section-row-${section.id}`}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <GripVertical className="h-5 w-5 cursor-move text-muted-foreground" />
                    
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <TypeIcon className="h-5 w-5 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{typeInfo.label}</p>
                        {section.title && (
                          <span className="text-muted-foreground">— {section.title}</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Order: {section.orderNo}
                      </p>
                    </div>

                    <Badge variant={section.isVisible ? "secondary" : "outline"}>
                      {section.isVisible ? (
                        <><Eye className="mr-1 h-3 w-3" /> Visible</>
                      ) : (
                        <><EyeOff className="mr-1 h-3 w-3" /> Hidden</>
                      )}
                    </Badge>

                    <Switch
                      checked={section.isVisible ?? false}
                      onCheckedChange={(checked) =>
                        toggleVisibilityMutation.mutate({
                          id: section.id,
                          isVisible: checked,
                        })
                      }
                    />

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingSection(section);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(section.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Layout className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">No sections yet</h3>
              <p className="text-sm text-muted-foreground">
                Add sections to build your shop page
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
