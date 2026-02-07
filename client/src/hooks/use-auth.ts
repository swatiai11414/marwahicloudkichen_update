import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AuthStatus {
  authenticated: boolean;
  role?: "super_admin" | "shop_admin";
  shopId?: string;
}

async function fetchAuthStatus(): Promise<AuthStatus> {
  const response = await fetch("/api/auth/status", {
    credentials: "include",
  });

  if (!response.ok) {
    return { authenticated: false };
  }

  return response.json();
}

async function logoutApi(): Promise<void> {
  await apiRequest("POST", "/api/auth/logout");
}

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data: authStatus, isLoading } = useQuery<AuthStatus>({
    queryKey: ["/api/auth/status"],
    queryFn: fetchAuthStatus,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const logoutMutation = useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/status"], { authenticated: false });
      window.location.href = "/";
    },
  });

  return {
    isAuthenticated: authStatus?.authenticated ?? false,
    role: authStatus?.role,
    shopId: authStatus?.shopId,
    isLoading,
    isSuperAdmin: authStatus?.role === "super_admin",
    isShopAdmin: authStatus?.role === "shop_admin",
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
