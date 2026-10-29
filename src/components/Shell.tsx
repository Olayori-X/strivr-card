"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCards } from "@/features/cards/CardsProvider";
import { BottomNav, normalisePath } from "./BottomNav";

const NAV_PAGES = ["/cards", "/cards/my-cards"];

/** Frames every /cards page, shows the bottom nav, and sends first-time visitors to choose storage. */
export function Shell({ children }: { children: React.ReactNode }) {
  const path = normalisePath(usePathname());
  const router = useRouter();
  const { ready, mode } = useCards();

  useEffect(() => {
    if (ready && !mode && path !== "/cards/folder") router.replace("/cards/folder/");
  }, [ready, mode, path, router]);

  const showNav = NAV_PAGES.includes(path);
  return (
    <div className={`app${showNav ? " has-nav" : ""}`}>
      {ready || path === "/cards/folder" ? children : null}
      {showNav && <BottomNav />}
    </div>
  );
}
