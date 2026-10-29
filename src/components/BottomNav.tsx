"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, ImageIcon, QrIcon, ScanIcon } from "./Icons";

const ITEMS = [
  { href: "/cards", label: "Home", Icon: HomeIcon },
  { href: "/cards/my-cards", label: "My Cards", Icon: ImageIcon },
  { href: "/cards/share", label: "Share", Icon: QrIcon },
  { href: "/cards/scan", label: "Scan", Icon: ScanIcon },
];

export function normalisePath(p: string | null): string {
  if (!p) return "";
  return p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
}

export function BottomNav() {
  const path = normalisePath(usePathname());
  return (
    <nav className="nav" aria-label="Main">
      {ITEMS.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className={path === href ? "on" : ""} aria-current={path === href ? "page" : undefined}>
          <Icon />
          {label}
        </Link>
      ))}
    </nav>
  );
}
