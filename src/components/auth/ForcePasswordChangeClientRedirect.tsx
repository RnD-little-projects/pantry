"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ForcePasswordChangeClientRedirect() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isForceChangePage = pathname === "/auth/force-password-change";
    const isApiRoute = pathname.startsWith("/api");
    const isLogin = pathname === "/login";

    if (!isForceChangePage && !isApiRoute && !isLogin) {
      // Use window.location.href for immediate hard redirect or router.replace
      router.replace("/auth/force-password-change");
    }
  }, [pathname, router]);

  // If mounted and we are on a page that needs redirecting, we could render a full-screen overlay to block content
  // But we return null to keep it simple, a slight flash might occur but it's safe.
  
  if (mounted) {
    const isForceChangePage = pathname === "/auth/force-password-change";
    const isApiRoute = pathname.startsWith("/api");
    const isLogin = pathname === "/login";
    
    if (!isForceChangePage && !isApiRoute && !isLogin) {
      return (
        <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center text-white">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent mb-4"></div>
          <p className="text-slate-400 animate-pulse">Redirecting to security update...</p>
        </div>
      );
    }
  }

  return null;
}
