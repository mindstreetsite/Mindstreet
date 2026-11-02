import { del, list, put } from "@vercel/blob";
import path from "node:path";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/cms/admin-session";
import { readCmsState, updateCmsState } from "@/lib/cms/blob-store";
import { publishedImageUses, withoutImage } from "@/lib/cms/storage";

export const dynamic = "force-dynamic";

const EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"]);
const MAX_BYTES = 10_000_000;

function isLibraryBlobUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".blob.vercel-storage.com")) {
      return false;
    }
    return decodeURIComponent(parsed.pathname).startsWith("/library/");
  } catch {
    return false;
  }
}

async function listLibraryImages(): Promise<string[]> {
  const images: string[] = [];
  let cursor: string | undefined;
  do {
    const listed = await list({ prefix: "library/", limit: 1000, cursor });
    for (const blob of listed.blobs) {
      if (EXTENSIONS.has(path.extname(blob.pathname).toLowerCase())) {
        images.push(blob.url);
      }
    }
    cursor = listed.hasMore ? listed.cursor : undefined;
  } while (cursor);
  return images.sort((a, b) => a.localeCompare(b, "sv"));
}

export async function GET() {
  try {
    return NextResponse.json({ images: await listLibraryImages() });
  } catch {
    return NextResponse.json({ images: [], error: "Kunde inte läsa bildbiblioteket." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Logga in för att ladda upp bilder." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Välj en bild att ladda upp." }, { status: 400 });
  }

  const extension = path.extname(file.name).toLowerCase();
  if (!EXTENSIONS.has(extension)) {
    return NextResponse.json({ error: "Använd jpg, png, webp, gif, svg eller avif." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Bilden får vara högst 10 MB." }, { status: 413 });
  }

  const stem = path
    .basename(file.name, extension)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  try {
    const blob = await put(`library/${stem || "bild"}${extension}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
    return NextResponse.json({ url: blob.url });
  } catch {
    return NextResponse.json({ error: "Kunde inte ladda upp bilden." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Logga in för att ta bort bilder." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
  }

  const url = body && typeof body === "object" && "url" in body ? (body as { url?: unknown }).url : null;
  if (typeof url !== "string" || !isLibraryBlobUrl(url)) {
    return NextResponse.json({ error: "Bilden finns inte i blob-biblioteket." }, { status: 400 });
  }

  try {
    const stored = await readCmsState();
    const pages = publishedImageUses(stored.state.pages, url);
    if (pages.length > 0) {
      return NextResponse.json(
        {
          error: "Bilden används på publicerade sidor. Byt ut den där innan du tar bort den.",
          pages,
        },
        { status: 409 },
      );
    }
  } catch {
    return NextResponse.json({ error: "Kunde inte kontrollera om bilden används." }, { status: 500 });
  }

  try {
    await del(url);
  } catch {
    return NextResponse.json({ error: "Kunde inte ta bort bilden." }, { status: 500 });
  }

  try {
    await updateCmsState((state) => {
      const next = withoutImage(state, url);
      return next.changed ? next.state : state;
    });
  } catch {
    return NextResponse.json({
      ok: true,
      warning: "Bilden togs bort från blobben, men kunde inte tas bort från sidorna.",
    });
  }

  return NextResponse.json({ ok: true });
}
