"use client";

/**
 * Settings: name, daily goal, dark mode, sound, demo tools (time travel + reset),
 * and placeholders for account features the assignment allows us to skip.
 */
import { useState } from "react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Mascot from "@/components/ui/Mascot";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { setSoundOn, useSoundOn } from "@/lib/sounds";
import { setTheme, useTheme } from "@/lib/theme";
import type { Me, Settings } from "@/lib/types";
import { useUser } from "@/lib/user-context";

const GOALS = [
  { xp: 10, label: "Casual" },
  { xp: 20, label: "Regular" },
  { xp: 30, label: "Serious" },
  { xp: 50, label: "Intense" },
] as const;

export default function SettingsPage() {
  const { me, setMe, refreshMe } = useUser();
  const showToast = useToast();
  const theme = useTheme();
  const soundOn = useSoundOn();
  const [confirmReset, setConfirmReset] = useState(false);

  async function save(settings: Settings, message: string) {
    try {
      setMe(await api.updateSettings(settings));
      showToast(message, "✅", "success");
    } catch {
      showToast("Couldn't save, try again", "⚠️", "error");
    }
  }

  async function nextDay() {
    setMe(await api.nextDay());
    showToast("A day has passed ☀️ Do a lesson to keep your streak!", "📅");
  }

  async function resetDemo() {
    await api.resetDemo();
    await refreshMe();
    setConfirmReset(false);
    showToast("Demo data reset", "🔄", "success");
  }

  if (!me) return <p className="py-16 text-center text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-extrabold">Settings</h1>

      <Section title="Profile">
        {/* key: if the name changes elsewhere, the form starts fresh with the new value */}
        <NameForm key={me.name} me={me} onSave={(name) => save({ name }, "Name updated")} />
      </Section>

      <Section title="Daily goal">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {GOALS.map((goal) => {
            const selected = me.daily_goal === goal.xp;
            return (
              <button
                key={goal.xp}
                onClick={() => !selected && save({ daily_goal: goal.xp }, `Daily goal set to ${goal.xp} XP`)}
                className={cn(
                  "rounded-2xl border-2 px-3 py-4 text-center active:translate-y-[2px]",
                  selected
                    ? "border-blue-line bg-blue-light text-blue shadow-[0_3px_0_var(--blue-soft-line)]"
                    : "border-line shadow-[0_3px_0_var(--line)] hover:bg-surface-2",
                )}
              >
                <p className="font-extrabold">{goal.label}</p>
                <p className="text-sm text-muted">{goal.xp} XP / day</p>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Preferences">
        <Card className="flex flex-col divide-y-2 divide-line py-0">
          <ToggleRow
            label="Dark mode"
            hint="Easier on the eyes at night"
            checked={theme === "dark"}
            onChange={(on) => setTheme(on ? "dark" : "light")}
          />
          <ToggleRow
            label="Sound effects & audio"
            hint="Dings, buzzes and Spanish pronunciation"
            checked={soundOn}
            onChange={setSoundOn}
          />
        </Card>
      </Section>

      <Section title="Demo tools">
        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <p className="font-extrabold">Simulate next day</p>
              <p className="text-sm text-muted">
                Moves time forward one day to test the streak. Do a lesson before each press to keep your streak
                - skip a day and it resets.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={nextDay}>
              ☀️ Next day
            </Button>
          </div>
          <div className="flex flex-col gap-3 border-t-2 border-line pt-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <p className="font-extrabold">Reset demo data</p>
              <p className="text-sm text-muted">Puts the course and Alex&apos;s progress back to the starting point.</p>
            </div>
            <Button variant="danger" size="sm" onClick={() => setConfirmReset(true)}>
              Reset
            </Button>
          </div>
        </Card>
      </Section>

      <Section title="Account">
        <Card className="flex flex-col divide-y-2 divide-line py-0">
          {["Notifications", "Privacy settings", "Change course language", "Sign in & password"].map((item) => (
            <div key={item} className="flex items-center justify-between py-4">
              <span className="font-bold">{item}</span>
              <span className="rounded-lg bg-surface-2 px-2 py-1 text-xs font-extrabold text-muted uppercase">
                Coming soon
              </span>
            </div>
          ))}
        </Card>
      </Section>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)}>
        <Mascot mood="thinking" size={100} className="mx-auto" />
        <h2 className="mt-4 text-2xl font-extrabold">Reset all progress?</h2>
        <p className="mt-2 text-muted">XP, streak, hearts and achievements go back to the demo starting point.</p>
        <div className="mt-6 flex flex-col gap-3">
          <Button variant="danger" fullWidth onClick={resetDemo}>
            Yes, reset
          </Button>
          <Button variant="ghost" fullWidth onClick={() => setConfirmReset(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

function NameForm({ me, onSave }: { me: Me; onSave: (name: string) => void }) {
  const [name, setName] = useState(me.name);
  const trimmed = name.trim();
  const canSave = trimmed.length > 0 && trimmed !== me.name;

  return (
    <form
      className="flex gap-3"
      onSubmit={(event) => {
        event.preventDefault(); // stay on the page instead of a browser form submit
        if (canSave) onSave(trimmed);
      }}
    >
      <label className="flex-1">
        <span className="sr-only">Name</span>
        <input
          value={name}
          maxLength={30}
          onChange={(event) => setName(event.target.value)}
          className="h-12 w-full rounded-2xl border-2 border-line bg-surface-2 px-4 text-lg outline-none focus:border-blue-line"
        />
      </label>
      <Button type="submit" disabled={!canSave}>
        Save
      </Button>
    </form>
  );
}

/** A label with an on/off switch. */
function ToggleRow(props: { label: string; hint: string; checked: boolean; onChange: (on: boolean) => void }) {
  const { label, hint, checked, onChange } = props;
  return (
    <div className="flex items-center gap-4 py-4">
      <div className="flex-1">
        <p className="font-extrabold">{label}</p>
        <p className="text-sm text-muted">{hint}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn("relative h-8 w-14 shrink-0 rounded-full transition-colors", checked ? "bg-blue" : "bg-line")}
      >
        <span
          className={cn(
            "absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-6",
          )}
        />
      </button>
    </div>
  );
}
