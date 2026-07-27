import Link from "next/link";
import Image from "next/image";

import { Container } from "@/components/shared/container";
import { FOOTER_LINKS } from "@/data/navigation";
import { SITE } from "@/constants/site";
import type { SponsorEntry } from "@/lib/data/sponsors";
import type { SocialLink } from "@/lib/data/social-links";

function LogoWall({ entries }: { entries: SponsorEntry[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
      {entries.map((entry) => {
        if (!entry.logoUrl) {
          return (
            <span key={entry.name} className="text-sm">
              {entry.name}
            </span>
          );
        }

        // eslint-disable-next-line @next/next/no-img-element
        const logo = <img src={entry.logoUrl} alt={entry.name} className="h-[55px] w-[100px] object-contain" />;

        return entry.websiteUrl ? (
          <a
            key={entry.name}
            href={entry.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-opacity hover:opacity-80"
          >
            {logo}
          </a>
        ) : (
          <span key={entry.name}>{logo}</span>
        );
      })}
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
      <Container className="flex flex-col items-center gap-6 py-14 text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/60">Patrons</span>
        <LogoWall entries={patrons} />
      </Container>

      <div className="border-t border-primary-foreground/10">
        <Container className="flex flex-col items-center gap-6 py-14 text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/60">
            Official Suppliers
          </span>
          <LogoWall entries={officialSuppliers} />
        </Container>
      </div>

      <div className="border-t border-primary-foreground/10">
        <Container className="flex flex-col gap-6 py-8 text-xs text-primary-foreground/70 sm:flex-row sm:items-center sm:justify-between">
          <ul className="flex flex-wrap items-center justify-center gap-y-2 sm:justify-start">
            {FOOTER_LINKS.map((link, index) => (
              <li key={link.label} className="flex items-center">
                {index > 0 ? (
                  <span className="px-2 text-primary-foreground/25" aria-hidden="true">
                    |
                  </span>
                ) : null}
                <Link href={link.href} className="transition-colors hover:text-accent">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {socialLinks.length ? (
            <ul className="flex justify-center gap-3">
              {socialLinks.map((social) => (
                <li key={social.platform}>
                  <Link
                    href={social.url}
                    aria-label={social.label}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-primary-foreground/20 transition-colors hover:bg-primary-foreground/10"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={social.iconUrl} alt="" className="h-6 w-6 object-contain" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </Container>
      </div>

      <div className="border-t border-primary-foreground/10 bg-primary-foreground/[0.03]">
        <Container className="flex flex-col gap-4 py-8 text-xs text-primary-foreground/60 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold text-primary-foreground">
            {logoUrl ? (
              <Image src={logoUrl} alt="" width={28} height={28} className="h-7 w-7 rounded-full object-contain" />
            ) : null}
            {SITE.name}
          </Link>
          <p>
            © {new Date().getFullYear()} Legs Open Championships Ltd. Registered in Fifeshire. The Beach House,
            Seabrook, Fifeshire. This is a fictional, educational recreation and is not affiliated with any real
            golf championship.
          </p>
        </Container>
      </div>
    </footer>
  );
}
