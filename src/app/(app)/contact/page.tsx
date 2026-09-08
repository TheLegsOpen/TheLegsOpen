import { notFound } from "next/navigation";

/**
 * Contact page, temporarily withdrawn (2026-09-08).
 *
 * Not simply unlinked: the form behind it never sent anything. src/app/(app)/api/contact/route.ts
 * validated the submission, waited, and returned success without emailing or storing a word of it,
 * so anyone who used it believed they had been in touch when they had not. Leaving the page
 * reachable by URL would have kept that happening quietly.
 *
 * To bring it back: restore this file from git (the previous commit has the real page), re-add
 * "/contact" to sitemap.ts and the Contact Us links to data/navigation.ts, and make the API route
 * actually deliver -- see the notes in that file. The Privacy Policy also needs a line about
 * contact-form handling once it does.
 */
export default function ContactPage() {
  notFound();
}
