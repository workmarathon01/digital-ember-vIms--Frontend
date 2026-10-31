"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { FooterBanner } from "@/components/footer-banner";
import { useAuth } from "@/lib/auth-context";
import {
  can,
  hasFeatureAccess,
  routeFeatures,
  routePermissions,
} from "@/lib/permissions";

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, hydrated } = useAuth();
  const required = routePermissions[pathname];
  const requiredFeature = routeFeatures[pathname];
  const allowed =
    (!required || can(user, required.resource, required.action)) &&
    hasFeatureAccess(user, requiredFeature);

  useEffect(() => {
    if (!hydrated) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (!allowed) {
      router.replace("/dashboard");
    }
  }, [hydrated, isAuthenticated, allowed, router]);

  if (!hydrated || !isAuthenticated || !allowed) return null;

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />

      <div className="ml-64 flex min-h-screen flex-col">
        <main className="w-full max-w-6xl flex-1 px-6 py-8">
          {children}
        </main>
        <FooterBanner />
      </div>
    </div>
  );
}