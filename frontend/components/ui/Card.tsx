import { cn } from "@/lib/cn";

/** A rounded box with a grey border, used for panels like "Daily goal". */
export default function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-2xl border-2 border-line p-5", className)}>{children}</div>;
}
