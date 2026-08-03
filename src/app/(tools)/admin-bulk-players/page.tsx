import { headers as getHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { BulkPlayerUpload } from "@/components/admin-bulk-players/bulk-player-upload";

export const dynamic = "force-dynamic";

export default async function AdminBulkPlayersPage() {
  const payload = await getPayload({ config: configPromise });
  const headersList = await getHeaders();
  const { user } = await payload.auth({ headers: headersList });

  if (!user) {
    redirect("/admin/login?redirect=/admin-bulk-players");
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold">Bulk Upload Players</h1>
      <p className="mt-2 text-sm text-surface-dark-foreground/70">
        Add or update many players at once from a spreadsheet, instead of one at a time in Admin.
      </p>
      <div className="mt-8">
        <BulkPlayerUpload />
      </div>
    </main>
  );
}
