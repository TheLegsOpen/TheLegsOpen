"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Mode = "pin" | "admin";

export function PinLoginForm() {
  const [mode, setMode] = useState<Mode>("pin");

  return (
    <div className="flex w-full max-w-sm flex-col gap-5 rounded-lg border border-border bg-card p-8 text-card-foreground shadow-card-hover">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Scorer Login</h1>
        <p className="text-sm text-muted-foreground">
          {mode === "pin" ? "Enter your group's 5-character PIN to start scoring." : "Sign in to pick any group to score."}
        </p>
      </div>

      <div className="flex rounded-md border border-border p-1 text-sm font-semibold uppercase tracking-wide">
        <button
          type="button"
          onClick={() => setMode("pin")}
          className={cn("flex-1 rounded-sm py-1.5 transition-colors", mode === "pin" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
        >
          PIN
        </button>
        <button
          type="button"
          onClick={() => setMode("admin")}
          className={cn("flex-1 rounded-sm py-1.5 transition-colors", mode === "admin" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
        >
          Admin
        </button>
      </div>

      {mode === "pin" ? <PinForm /> : <AdminForm />}
    </div>
  );
}

function PinForm() {
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="pin" className="sr-only">
          PIN
        </Label>
        <Input
          id="pin"
          name="pin"
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          inputMode="text"
          enterKeyHint="go"
          maxLength={5}
          value={pin}
          // Uppercasing is done visually (the `uppercase` class below) and again server-side on
          // submit -- forcing it into the controlled value on every keystroke was the culprit
          // behind a real bug on Samsung's keyboard, where the synchronous value rewrite desynced
          // the input from React state and the field would go blank on the next re-render.
          onChange={(e) => setPin(e.target.value)}
          placeholder="•••••"
          className="h-16 text-center font-display text-3xl font-bold uppercase tracking-[0.3em] placeholder:font-sans placeholder:text-2xl placeholder:tracking-widest placeholder:text-muted-foreground/40"
          aria-invalid={Boolean(error)}
        />
        {error ? (
          <p role="alert" className="text-center text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        variant="accent"
        size="lg"
        disabled={submitting}
        className={cn(
          "w-full uppercase tracking-wide",
          pin.trim().length === 0 && !submitting && "bg-muted text-muted-foreground hover:bg-muted",
        )}
      >
        {submitting ? "Checking…" : pin.trim().length === 0 ? "Enter your PIN above" : "Start Scoring"}
      </Button>
    </form>
  );
}

function AdminForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    setError(null);

    try {
      // Payload's own built-in auth endpoint for the "users" collection -- sets its real,
      // HttpOnly session cookie directly, so /score/groups and /api/scoring/select-group can
      // just check payload.auth() like any other admin-only route, no bespoke admin-session
      // code of our own to get wrong.
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { errors?: { message?: string }[] };
        setError(body.errors?.[0]?.message ?? "Email or password wasn't recognised.");
        setSubmitting(false);
        return;
      }
      router.push("/score/groups");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="admin-email">Email</Label>
        <Input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="admin-password">Password</Label>
        <Input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error ? (
        <p role="alert" className="text-center text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="accent" size="lg" disabled={submitting} className="w-full uppercase tracking-wide">
        {submitting ? "Signing in…" : "Sign In"}
      </Button>
    </form>
  );
}
