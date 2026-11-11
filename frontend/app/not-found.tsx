/** Shown for any URL that doesn't exist, e.g. /lesson/abc or /nothing-here. */
import Link from "next/link";

import { buttonClasses } from "@/components/ui/Button";
import Mascot from "@/components/ui/Mascot";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Mascot mood="sad" size={150} />
      <h1 className="text-3xl font-extrabold">Page not found</h1>
      <p className="max-w-sm text-muted">This page wandered off. Let&apos;s get you back to your lessons.</p>
      <Link href="/" className={buttonClasses("primary", "lg")}>
        Back to learning
      </Link>
    </div>
  );
}
