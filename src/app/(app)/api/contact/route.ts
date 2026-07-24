import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { delay } from "@/lib/mock-api";

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  topic: z.string().min(1),
  message: z.string().min(10),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = contactSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  await delay(700);

  // Demo-only failure path so the form's error state is reachable without a real backend.
  if (parsed.data.email.startsWith("fail@")) {
    return NextResponse.json({ error: "Something went wrong sending your message. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
