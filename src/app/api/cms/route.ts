import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/cms/admin-session";
import { applyCmsChange, readCmsState } from "@/lib/cms/blob-store";
import { parseCmsChange } from "@/lib/cms/merge";
import { serializeState } from "@/lib/cms/storage";

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

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Ogiltigt innehåll." }, { status: 400 });
  }

  const payload = body as { change?: unknown; baseEtag?: unknown };
  const change = parseCmsChange(payload.change);
  if (!change) {
    return NextResponse.json({ error: "Ogiltigt innehåll." }, { status: 400 });
  }

  const baseEtag = payload.baseEtag == null ? null : payload.baseEtag;
  if (baseEtag !== null && typeof baseEtag !== "string") {
    return NextResponse.json({ error: "Ogiltigt innehåll." }, { status: 400 });
  }

  try {
    const result = await applyCmsChange(baseEtag, change);
    const saved = {
      etag: result.etag,
      state: serializeState(result.state),
      empty: result.empty,
      conflicts: result.conflicts,
    };
    if (!result.ok) {
      return NextResponse.json(
        { ...saved, error: "Innehållet har ändrats av någon annan." },
        { status: 409 },
      );
    }
    return NextResponse.json(saved);
  } catch {
    return NextResponse.json({ error: "Kunde inte spara." }, { status: 500 });
  }
}
