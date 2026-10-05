import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/cms/admin-session";
import { readCmsState, writeCmsState } from "@/lib/cms/blob-store";
import { hydrateState, SEED_VERSION } from "@/lib/cms/storage";

export const dynamic = "force-dynamic";

const MAX_BYTES = 4_000_000;

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Logga in för att redigera." }, { status: 401 });
  }

  try {
    const stored = await readCmsState();
    return NextResponse.json(stored);
  } catch {
    return NextResponse.json({ error: "Kunde inte läsa sidorna." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Logga in för att redigera." }, { status: 401 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BYTES) {
    return NextResponse.json({ error: "Innehållet är för stort för att sparas." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Ogiltigt innehåll." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("state" in body)) {
    return NextResponse.json({ error: "Ogiltigt innehåll." }, { status: 400 });
  }

  const payload = body as { state?: unknown };
  const incoming = payload.state;
  const state = hydrateState(
    incoming && typeof incoming === "object" ? { ...incoming, seedVersion: SEED_VERSION } : incoming,
  );

  try {
    const nextEtag = await writeCmsState(state);
    return NextResponse.json({ etag: nextEtag });
  } catch {
    return NextResponse.json({ error: "Kunde inte spara." }, { status: 500 });
  }
}
