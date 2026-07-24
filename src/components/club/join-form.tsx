"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function JoinForm() {
  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => event.preventDefault()}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="club-name">Full name</Label>
        <Input id="club-name" name="name" autoComplete="name" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="club-email">Email address</Label>
        <Input id="club-email" name="email" type="email" autoComplete="email" required />
      </div>
      <Button type="submit" size="lg">
        Join The Clubhouse
      </Button>
      <p className="text-xs text-muted-foreground">
        This demo form doesn&rsquo;t submit anywhere — it&rsquo;s a placeholder for the real membership flow.
      </p>
    </form>
  );
}
