import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { FullPageLoader } from "@/components/loading-spinner";
import type { Profile } from "@shared/schema";

export default function Home() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const { data: profile, isLoading: profileLoading } = useQuery<Profile>({
    queryKey: ["/api/profile"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      return;
    }

    if (!profileLoading && profile) {
      if (profile.role === "super_admin") {
        setLocation("/super-admin");
      } else if (profile.role === "shop_admin" && profile.shopId) {
        setLocation("/admin");
      } else {
        setLocation("/setup");
      }
    }
  }, [authLoading, isAuthenticated, profile, profileLoading, setLocation]);

  if (authLoading || profileLoading) {
    return <FullPageLoader />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <FullPageLoader />;
}
