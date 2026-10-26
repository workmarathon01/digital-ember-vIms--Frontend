"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Static export cannot run `redirect()` at request time, so redirect on the
// client instead of relying on the build-time error page.
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return null;
}
