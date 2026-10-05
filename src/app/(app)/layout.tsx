"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { FooterBanner } from "@/components/footer-banner";
import { useAuth } from "@/lib/auth-context";

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, hydrated } = useAuth();

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated || !isAuthenticated) return null;

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