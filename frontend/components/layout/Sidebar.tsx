"use client";

/**
 * Left menu on tablets and desktops (hidden on phones, which use MobileNav).
 *   tablet  (md, >=768px):  icons only, 88px wide
 *   desktop (lg, >=1024px): icons + labels, 256px wide
 */
import Link from "next/link";
import { usePathname } from "next/navigation";

import Mascot from "@/components/ui/Mascot";
import { cn } from "@/lib/cn";
import { NAV_ITEMS, isActive } from "./nav-items";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[88px] flex-col border-r-2 border-line bg-bg px-3 py-6 md:flex lg:w-64 lg:px-4">
      <Link href="/" className="mb-6 flex h-12 items-center justify-center lg:justify-start lg:px-4">
        <Mascot size={44} className="lg:hidden" />
        <span className="hidden text-[32px] font-black tracking-tight text-green lg:block">duolingo</span>
      </Link>

      <nav className="flex flex-col gap-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "flex h-[52px] items-center justify-center gap-4 rounded-xl border-2 px-3",
                "text-[15px] font-extrabold uppercase tracking-wide lg:justify-start lg:px-4",
                active
                  ? "border-blue-line bg-blue-light text-blue"
                  : "border-transparent text-muted hover:bg-surface-2",
              )}
            >
              <span className="text-[28px] leading-none">{item.icon}</span>
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
