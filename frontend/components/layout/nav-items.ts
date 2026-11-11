/** Menu entries shared by the desktop Sidebar and the phone MobileNav. */
export const NAV_ITEMS = [
  { href: "/", label: "Learn", icon: "🏠" },
  { href: "/practice", label: "Practice", icon: "🏋️" },
  { href: "/leaderboard", label: "Leaderboards", icon: "🏆" },
  { href: "/shop", label: "Shop", icon: "🛍️" },
  { href: "/profile", label: "Profile", icon: "👤" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

/** "/" only matches exactly; other items also match their sub-pages. */
export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
