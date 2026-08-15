import { PinLoginForm } from "@/components/scoring/pin-login-form";

export default function ScoreLoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/60">The Legs Open · On-Course Scoring</p>
      <PinLoginForm />
    </div>
  );
}
