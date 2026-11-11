import MobileNav from "@/components/layout/MobileNav";
import RightPanel from "@/components/layout/RightPanel";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";

/**
 * Shell for every normal page (Learn, Practice, Leaderboard, Shop, Profile, Settings).
 * The "(main)" folder is a route group: it adds this layout without adding "/main" to the URL.
 * The lesson player lives outside this group, so it is full-screen with no menus.
 *
 *  phone   (<768px):    [TopBar] [page] [MobileNav]
 *  tablet  (768px+):    [Sidebar icons] [TopBar] [page]
 *  laptop  (1024px+):   [Sidebar with labels] [TopBar] [page]
 *  desktop (1280px+):   [Sidebar] [page] [RightPanel]
 */
export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="md:pl-[88px] lg:pl-64">
        <TopBar />
        <div className="mx-auto flex max-w-[1056px] justify-center gap-12 px-4 lg:px-6">
          <main className="w-full max-w-[600px] flex-1 pt-6 pb-24 md:pb-10">{children}</main>
          <RightPanel />
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
