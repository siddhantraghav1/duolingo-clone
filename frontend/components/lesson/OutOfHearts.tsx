"use client";

/** Modal shown when the learner has 0 hearts: refill with gems, go practise, or leave. */
import Link from "next/link";
import { useState } from "react";

import Button, { buttonClasses } from "@/components/ui/Button";
import Mascot from "@/components/ui/Mascot";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { useUser } from "@/lib/user-context";

const REFILL_COST = 350; // same as REFILL_COST_GEMS in the backend

type OutOfHeartsProps = {
  open: boolean;
  onRefilled: (hearts: number) => void;
  onQuit: () => void;
};

export default function OutOfHearts({ open, onRefilled, onQuit }: OutOfHeartsProps) {
  const { me, setMe } = useUser();
  const showToast = useToast();
  const [busy, setBusy] = useState(false);

  async function refill() {
    setBusy(true);
    try {
      const updated = await api.refillHearts();
      setMe(updated);
      onRefilled(updated.hearts);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "Something went wrong", "💎", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open}>
      <Mascot mood="sad" size={120} className="mx-auto" />
      <h2 className="mt-4 text-2xl font-extrabold">You ran out of hearts!</h2>
      <p className="mt-2 text-muted">
        Practice earns hearts back, or refill now. You have <b className="text-blue">{me?.gems ?? 0} 💎</b>
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <Button
          variant="secondary"
          fullWidth
          onClick={refill}
          disabled={busy || (me?.gems ?? 0) < REFILL_COST}
        >
          Refill for {REFILL_COST} 💎
        </Button>
        <Link href="/review" className={buttonClasses("outline", "md", { fullWidth: true })}>
          Practice to earn hearts
        </Link>
        <Button variant="ghost" fullWidth onClick={onQuit}>
          End session
        </Button>
      </div>
    </Modal>
  );
}
