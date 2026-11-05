"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { persistPublicVisit } from "@/lib/cms/return-path";

export function RememberPublicPath() {
  const pathname = usePathname();

  useEffect(() => {
    function persist() {
      persistPublicVisit(pathname, window.location.search);
    }
    persist();
    window.addEventListener("pageshow", persist);
    return () => window.removeEventListener("pageshow", persist);
  }, [pathname]);

  return null;
}
