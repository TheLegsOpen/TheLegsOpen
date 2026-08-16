import Image from "next/image";

import { getSiteTheme } from "@/lib/data/site-theme";
import { PinLoginForm } from "@/components/scoring/pin-login-form";

export default async function ScoreLoginPage() {
  const theme = await getSiteTheme();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      {theme.logoUrl ? (
        <Image src={theme.logoUrl} alt="" width={64} height={64} className="h-16 w-16 rounded-full object-contain" />
      ) : (
        <span className="flex h-16 w-16 items-center justify-center rounded-full border border-primary-foreground/30 text-lg">LO</span>
      )}
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/60">The Legs Open · On-Course Scoring</p>
      <PinLoginForm />
    </div>
  );
}
