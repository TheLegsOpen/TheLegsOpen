import { NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";

export async function GET() {
  const payload = await getPayload({ config: configPromise });

  const championships = await payload.find({
    collection: "championships",
    where: { year: { equals: 2013 } },
    limit: 1,
    depth: 0,
  });
  const championship = championships.docs[0];
  if (!championship) {
    return NextResponse.json({ error: "2013 championship not found" }, { status: 404 });
  }

  const [scorecards, liveBlogPosts, triggerLog] = await Promise.all([
    payload.delete({ collection: "scorecards", where: { championship: { equals: championship.id } } }),
    payload.delete({ collection: "live-blog-posts", where: { championship: { equals: championship.id } } }),
    payload.delete({ collection: "live-blog-trigger-log", where: { championship: { equals: championship.id } } }),
  ]);

  return NextResponse.json({
    championshipId: championship.id,
    scorecardsDeleted: scorecards.docs.length,
    liveBlogPostsDeleted: liveBlogPosts.docs.length,
    triggerLogDeleted: triggerLog.docs.length,
  });
}
