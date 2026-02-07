import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Pencil, Trash2, Palette } from "lucide-react";
import type { ShopTheme } from "@shared/schema";

const BUTTON_STYLES = [
  { value: "rounded", label: "Rounded" },
  { value: "pill", label: "Pill" },
  { value: "square", label: "Square" },
];

const FONT_OPTIONS = [
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans" },
  { value: "Inter", label: "Inter" },
  { value: "Poppins", label: "Poppins" },
  { value: "Open Sans", label: "Open Sans" },
  { value: "Roboto", label: "Roboto" },
];

export default function SuperAdminThemes() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<ShopTheme | null>(null);

  const { data: themes, isLoading } = useQuery<ShopTheme[]>({
    queryKey: ["/api/super-admin/themes"],
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<ShopTheme>) =>
      apiRequest("POST", "/api/super-admin/themes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/themes"] });
      setDialogOpen(false);
      setEditingTheme(null);
      toast({ title: "Theme created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create theme", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ShopTheme> }) =>
      apiRequest("PATCH", `/api/super-admin/themes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/themes"] });
      setDialogOpen(false);
      setEditingTheme(null);
      toast({ title: "Theme updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update theme", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/super-admin/themes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/themes"] });
      toast({ title: "Theme deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete theme", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const themeData = {
      name: formData.get("name") as string,
      primaryColor: formData.get("primaryColor") as string,
      secondaryColor: formData.get("secondaryColor") as string,
      fontFamily: formData.get("fontFamily") as string,
      buttonStyle: formData.get("buttonStyle") as string,
    };

    if (editingTheme) {
      updateMutation.mutate({ id: editingTheme.id, data: themeData });
    } else {
      createMutation.mutate(themeData);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Theme Management</h1>
            <p className="text-muted-foreground">
              Create and manage visual themes for shops
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingTheme(null)} data-testid="button-create-theme">
                <Plus className="mr-2 h-4 w-4" />
                Create Theme
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingTheme ? "Edit Theme" : "Create New Theme"}
                </DialogTitle>
                <DialogDescription>
                  Define colors and styles for shop pages
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Theme Name</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingTheme?.name || ""}
                      placeholder="e.g., Modern Blue"
                      required
                      data-testid="input-theme-name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primaryColor">Primary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="primaryColor"
                          name="primaryColor"
                          type="color"
                          defaultValue={editingTheme?.primaryColor || "#2563eb"}
                          className="h-10 w-14 p-1"
                          data-testid="input-primary-color"
                        />
                        <Input
                          type="text"
                          defaultValue={editingTheme?.primaryColor || "#2563eb"}
                          className="flex-1"
                          placeholder="#2563eb"
                          onChange={(e) => {
                            const colorInput = document.getElementById("primaryColor") as HTMLInputElement;
                            if (colorInput && /^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                              colorInput.value = e.target.value;
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondaryColor">Secondary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="secondaryColor"
                          name="secondaryColor"
                          type="color"
                          defaultValue={editingTheme?.secondaryColor || "#f59e0b"}
                          className="h-10 w-14 p-1"
                          data-testid="input-secondary-color"
                        />
                        <Input
                          type="text"
                          defaultValue={editingTheme?.secondaryColor || "#f59e0b"}
                          className="flex-1"
                          placeholder="#f59e0b"
                          onChange={(e) => {
                            const colorInput = document.getElementById("secondaryColor") as HTMLInputElement;
                            if (colorInput && /^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                              colorInput.value = e.target.value;
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fontFamily">Font Family</Label>
                      <Select name="fontFamily" defaultValue={editingTheme?.fontFamily || "Plus Jakarta Sans"}>
                        <SelectTrigger data-testid="select-font">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_OPTIONS.map((font) => (
                            <SelectItem key={font.value} value={font.value}>
                              {font.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="buttonStyle">Button Style</Label>
                      <Select name="buttonStyle" defaultValue={editingTheme?.buttonStyle || "rounded"}>
                        <SelectTrigger data-testid="select-button-style">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BUTTON_STYLES.map((style) => (
                            <SelectItem key={style.value} value={style.value}>
                              {style.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" data-testid="button-save-theme">
                    {editingTheme ? "Update" : "Create"} Theme
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
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : themes && themes.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {themes.map((theme) => (
              <Card key={theme.id} data-testid={`theme-card-${theme.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{theme.name}</CardTitle>
                      <CardDescription>{theme.fontFamily}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex gap-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-8 w-8 rounded-lg border border-border"
                        style={{ backgroundColor: theme.primaryColor }}
                      />
                      <span className="text-xs text-muted-foreground">Primary</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-8 w-8 rounded-lg border border-border"
                        style={{ backgroundColor: theme.secondaryColor }}
                      />
                      <span className="text-xs text-muted-foreground">Secondary</span>
                    </div>
                  </div>
                  <div className="mb-4 flex gap-2">
                    <span className="rounded-full bg-muted px-2 py-1 text-xs">
                      {theme.buttonStyle}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingTheme(theme);
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
                      onClick={() => deleteMutation.mutate(theme.id)}
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
              <Palette className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">No themes yet</h3>
              <p className="text-sm text-muted-foreground">
                Create your first theme to customize shop appearances
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
