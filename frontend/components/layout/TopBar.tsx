import StatsBar from "./StatsBar";

/** Stats row stuck to the top of the screen below 1280px (wider screens show it in the RightPanel). */
export default function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b-2 border-line bg-bg px-2 py-2 xl:hidden">
      <div className="mx-auto max-w-[600px]">
        <StatsBar />
      </div>
    </header>
  );
}
