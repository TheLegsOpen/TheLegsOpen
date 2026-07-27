import Link from "next/link";
import Image from "next/image";

import { Container } from "@/components/shared/container";
import { FOOTER_COLUMNS } from "@/data/navigation";
import { SITE } from "@/constants/site";
import type { SponsorEntry } from "@/lib/data/sponsors";
import type { SocialLink } from "@/lib/data/social-links";

function LogoWall({ entries }: { entries: SponsorEntry[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
      {entries.map((entry) =>
        entry.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={entry.name}
            src={entry.logoUrl}
            alt={entry.name}
            className="h-8 w-[100px] object-contain opacity-70 brightness-0 invert transition-opacity hover:opacity-100"
          />
        ) : (
          <span key={entry.name} className="text-sm">
            {entry.name}
          </span>
        ),
      )}
    </div>
  );
}

interface FooterProps {
  logoUrl?: string;
  patrons: SponsorEntry[];
  officialSuppliers: SponsorEntry[];
  socialLinks: SocialLink[];
}

export function Footer({ logoUrl, patrons, officialSuppliers, socialLinks }: FooterProps) {
  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <Container className="grid gap-12 py-16 sm:py-20 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Link href="/" className="flex items-center gap-2 font-display font-bold text-2xl">
            {logoUrl ? (
              <Image src={logoUrl} alt="" width={32} height={32} className="h-8 w-8 rounded-full object-contain" />
            ) : null}
            {SITE.name}
          </Link>
          <p className="max-w-xs text-sm text-primary-foreground/70">{SITE.description}</p>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <nav key={column.heading} aria-label={column.heading}>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-primary-foreground/60">
              {column.heading}
            </h3>
            <ul className="flex flex-col gap-2.5 text-sm">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-primary-foreground/85 transition-colors hover:text-accent">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>

      <div className="border-t border-primary-foreground/10">
        <Container className="flex flex-col gap-8 py-10 text-xs text-primary-foreground/60">
          <div className="flex flex-col gap-3">
            <span className="font-semibold uppercase tracking-wide text-primary-foreground/50">Patrons</span>
            <LogoWall entries={patrons} />
          </div>
          <div className="flex flex-col gap-3">
            <span className="font-semibold uppercase tracking-wide text-primary-foreground/50">Official Suppliers</span>
            <LogoWall entries={officialSuppliers} />
          </div>

          <div className="flex flex-col gap-6 border-t border-primary-foreground/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
            {socialLinks.length ? (
              <ul className="flex gap-3">
                {socialLinks.map((social) => (
                  <li key={social.platform}>
                    <Link
                      href={social.url}
                      aria-label={social.label}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-primary-foreground/20 transition-colors hover:bg-primary-foreground/10"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={social.iconUrl} alt="" className="h-4 w-4 object-contain" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
            <p>
              © {new Date().getFullYear()} Legs Open Championships Ltd. Registered in Fifeshire. The Beach House,
              Seabrook, Fifeshire. This is a fictional, educational recreation and is not affiliated with any real
              golf championship.
            </p>
          </div>
        </Container>
      </div>
    </footer>
  );
}
