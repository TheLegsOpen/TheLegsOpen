"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PinLoginForm() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pin.trim().length === 0) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/scoring/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "That PIN wasn't recognised.");
        setSubmitting(false);
        return;
      }
      router.push("/score/play");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-5 rounded-lg border border-border bg-card p-8 text-card-foreground shadow-card-hover">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Scorer Login</h1>
        <p className="text-sm text-muted-foreground">Enter your group&rsquo;s 5-character PIN to start scoring.</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="pin" className="sr-only">
          PIN
        </Label>
        <Input
          id="pin"
          name="pin"
          autoFocus
          autoComplete="off"
          autoCapitalize="characters"
          inputMode="text"
          maxLength={5}
          value={pin}
          onChange={(e) => setPin(e.target.value.toUpperCase())}
          placeholder="XXXXX"
          className="h-16 text-center font-display text-3xl font-bold uppercase tracking-[0.3em]"
          aria-invalid={Boolean(error)}
        />
        {error ? (
          <p role="alert" className="text-center text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      <Button type="submit" variant="accent" size="lg" disabled={submitting || pin.trim().length === 0} className="w-full uppercase tracking-wide">
        {submitting ? "Checking…" : "Start Scoring"}
      </Button>
    </form>
  );
}
