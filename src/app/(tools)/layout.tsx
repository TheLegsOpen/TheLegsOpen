import type { Metadata } from "next";

import "../(app)/globals.css";

export const metadata: Metadata = {
  title: "Scoring Tools",
  robots: { index: false, follow: false },
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface-dark text-surface-dark-foreground">{children}</body>
    </html>
  );
}
