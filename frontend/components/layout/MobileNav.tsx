"use client";

/** Bottom tab bar on phones (below 768px). */
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";
import { NAV_ITEMS, isActive } from "./nav-items";

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t-2 border-line bg-bg md:hidden">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-label={item.label}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl border-2 text-2xl",
            isActive(pathname, item.href) ? "border-blue-line bg-blue-light" : "border-transparent",
          )}
        >
          {item.icon}
        </Link>
      ))}
    </nav>
  );
}
