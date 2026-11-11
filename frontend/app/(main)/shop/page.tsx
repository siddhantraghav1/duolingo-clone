"use client";

/**
 * Shop: gems are mocked (no real payments).
 * Only "Refill hearts" really works; the other items show what's coming.
 */
import { useState } from "react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { useUser } from "@/lib/user-context";

const REFILL_COST = 350; // same as REFILL_COST_GEMS in the backend

export default function ShopPage() {
  const { me, setMe } = useUser();
  const showToast = useToast();
  const [busy, setBusy] = useState(false);

  const heartsFull = me ? me.hearts >= me.max_hearts : true;
  const canAfford = (me?.gems ?? 0) >= REFILL_COST;

  async function refill() {
    setBusy(true);
    try {
      setMe(await api.refillHearts());
      showToast("Hearts refilled!", "❤️", "success");
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "Something went wrong", "💎", "error");
    } finally {
      setBusy(false);
    }
  }

  const comingSoon = (name: string) => showToast(`${name} is coming soon!`, "🛍️");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">Shop</h1>
        <span className="rounded-2xl border-2 border-line px-4 py-2 text-lg font-extrabold text-blue">
          💎 {me?.gems ?? "–"}
        </span>
      </div>

      {/* promo banner for the (mocked) premium plan */}
      <div className="flex items-center gap-4 rounded-2xl bg-linear-to-r from-purple to-blue p-5 text-white">
        <span className="text-5xl">✨</span>
        <div className="flex-1">
          <p className="text-xl font-extrabold">Super Duolingo</p>
          <p className="opacity-90">Unlimited hearts, no ads, and personalised practice.</p>
        </div>
        <button
          onClick={() => comingSoon("Super Duolingo")}
          className="rounded-xl bg-white px-4 py-2 text-sm font-extrabold uppercase text-purple-dark"
        >
          Try free
        </button>
      </div>

      <section>
        <h2 className="mb-3 text-2xl font-extrabold">Hearts</h2>
        <Card className="flex flex-col divide-y-2 divide-line py-0">
          <ShopItem
            icon="❤️"
            title="Refill hearts"
            text={
              heartsFull
                ? "Your hearts are full. Mistakes won't stop you today!"
                : `You have ${me?.hearts} of ${me?.max_hearts} hearts. Get them all back now.`
            }
            action={
              <Button
                variant={heartsFull ? "outline" : "secondary"}
                size="sm"
                disabled={busy || heartsFull || !canAfford}
                onClick={refill}
              >
                {heartsFull ? "Full" : `💎 ${REFILL_COST}`}
              </Button>
            }
          />
          <ShopItem
            icon="♾️"
            title="Unlimited hearts"
            text="Never run out of hearts with Super Duolingo."
            action={<Button variant="outline" size="sm" onClick={() => comingSoon("Unlimited hearts")}>Soon</Button>}
          />
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-extrabold">Power-ups</h2>
        <Card className="flex flex-col divide-y-2 divide-line py-0">
          <ShopItem
            icon="🧊"
            title="Streak Freeze"
            text="Keeps your streak safe for one full day of inactivity."
            action={<Button variant="outline" size="sm" onClick={() => comingSoon("Streak Freeze")}>Soon</Button>}
          />
          <ShopItem
            icon="⏱️"
            title="Timer Boost"
            text="Adds 30 extra seconds to a Legendary challenge."
            action={<Button variant="outline" size="sm" onClick={() => comingSoon("Timer Boost")}>Soon</Button>}
          />
        </Card>
      </section>

      <p className="text-center text-sm text-muted">Gems are play money in this demo - no real purchases.</p>
    </div>
  );
}

function ShopItem({ icon, title, text, action }: { icon: string; title: string; text: string; action: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-4">
      <span className="text-4xl">{icon}</span>
      <div className="flex-1">
        <p className="text-lg font-extrabold">{title}</p>
        <p className="text-muted">{text}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
