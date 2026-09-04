import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import config from "@/payload.config";

/**
 * Temporary, secret-protected production route to recover admin access for
 * mark.alston@malston.co.uk. The site has no email adapter configured at all (see
 * payload.config.ts -- no `email:` key), so Payload's real forgot-password flow generates a
 * genuine reset token but has nowhere to actually send it; it just logs the subject line to the
 * console and drops the token on the floor. Rather than touching the database or the account's
 * password directly, this calls Payload's own forgotPassword Local API (the same operation the
 * "Forgot password?" link triggers) with disableEmail: true, which returns that same token
 * directly -- so the site owner can still complete the *real* reset flow at
 * /admin/reset/<token>, just without needing a working mailbox to receive the link.
 *
 * Deleted once the account is confirmed logged back in.
 */

const RESET_TOKEN_SECRET = "2015-lanark-9f3a7c1e-reset";
const RECOVERY_EMAIL = "mark.alston@malston.co.uk";

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== RESET_TOKEN_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const payload = await getPayload({ config });
  const token = await payload.forgotPassword({
    collection: "users",
    data: { email: RECOVERY_EMAIL },
    disableEmail: true,
  });

  const resetUrl = `${request.nextUrl.origin}/admin/reset/${token}`;
  return NextResponse.json({ resetUrl });
}
