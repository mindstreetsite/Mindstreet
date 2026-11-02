import { del, head, list, put } from "@vercel/blob";
import { unstable_noStore as noStore } from "next/cache";
import {
  applyChange,
  hasConflicts,
  isChangeEmpty,
  type CmsChange,
  type CmsConflicts,
} from "@/lib/cms/merge";
import { hydrateState, seedState, serializeState, type CmsState } from "@/lib/cms/storage";

const WRITE_ATTEMPTS = 8;

function storeKey(): string {
  const key = process.env.CMS_STATE_KEY;
  if (!key) throw new Error("CMS_STATE_KEY saknas.");
  return key;
}

function versionPrefix(): string {
  return `cms/${storeKey()}/v/`;
}

function legacyPath(): string {
  return `cms/${storeKey()}/state.json`;
}

export type StoredCms = {
  state: CmsState;
  etag: string | null;
  empty: boolean;
};

export type ApplyCmsResult = StoredCms & {
  ok: boolean;
  conflicts?: CmsConflicts;
};

type BlobVersion = {
  pathname: string;
  url: string;
  uploadedAt: Date;
};

async function readBlobJson(url: string): Promise<unknown | null> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;
  return response.json();
}

async function listVersionBlobs(): Promise<BlobVersion[]> {
  const blobs: BlobVersion[] = [];
  let cursor: string | undefined;
  do {
    const listed = await list({ prefix: versionPrefix(), limit: 1000, cursor });
    for (const blob of listed.blobs) {
      blobs.push({
        pathname: blob.pathname,
        url: blob.url,
        uploadedAt: blob.uploadedAt,
      });
    }
    cursor = listed.hasMore ? listed.cursor : undefined;
  } while (cursor);
  return blobs;
}

function newestBlob(blobs: BlobVersion[]): BlobVersion | undefined {
  return blobs.slice().sort((left, right) => {
    const time = right.uploadedAt.getTime() - left.uploadedAt.getTime();
    if (time !== 0) return time;
    return right.pathname.localeCompare(left.pathname);
  })[0];
}

async function putCmsState(state: CmsState): Promise<BlobVersion> {
  const pathname = `${versionPrefix()}${Date.now()}-${Math.random().toString(36).slice(2, 10)}.json`;
  const blob = await put(pathname, JSON.stringify(serializeState(state)), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
  return {
    pathname: blob.pathname,
    url: blob.url,
    uploadedAt: new Date(),
  };
}

async function keepIfLatest(written: BlobVersion): Promise<boolean> {
  const listed = await listVersionBlobs();
  const latest = newestBlob(listed);
  if (!latest || latest.pathname !== written.pathname) {
    await del(written.url).catch(() => undefined);
    return false;
  }
  const stale = listed.filter((item) => item.pathname !== written.pathname).map((item) => item.url);
  if (stale.length) {
    await del(stale).catch(() => undefined);
  }
  return true;
}

export async function readCmsState(): Promise<StoredCms> {
  noStore();
  const latest = newestBlob(await listVersionBlobs());
  if (latest) {
    const json = await readBlobJson(latest.url);
    if (json) return { state: hydrateState(json), etag: latest.pathname, empty: false };
  }

  try {
    const legacy = await head(legacyPath());
    const json = await readBlobJson(legacy.url);
    if (json) return { state: hydrateState(json), etag: legacy.pathname, empty: false };
  } catch {
    // No document has been saved yet.
  }

  return { state: seedState(), etag: null, empty: true };
}

export async function updateCmsState(mutate: (state: CmsState) => CmsState): Promise<StoredCms> {
  let last = await readCmsState();
  for (let attempt = 0; attempt < WRITE_ATTEMPTS; attempt += 1) {
    const next = mutate(last.state);
    if (JSON.stringify(serializeState(next)) === JSON.stringify(serializeState(last.state))) {
      return last;
    }
    const written = await putCmsState(next);
    if (await keepIfLatest(written)) {
      return { state: next, etag: written.pathname, empty: false };
    }
    last = await readCmsState();
  }
  throw new Error("Kunde inte spara.");
}

export async function applyCmsChange(
  baseEtag: string | null,
  change: CmsChange,
): Promise<ApplyCmsResult> {
  if (isChangeEmpty(change)) {
    const stored = await readCmsState();
    return { ...stored, ok: true };
  }

  let stored = await readCmsState();
  for (let attempt = 0; attempt < WRITE_ATTEMPTS; attempt += 1) {
    const trust = stored.etag === baseEtag;
    const merged = applyChange(stored.state, change, trust);
    if (!merged.applied) {
      return {
        ok: !hasConflicts(merged.conflicts),
        state: stored.state,
        etag: stored.etag,
        empty: stored.empty,
        conflicts: hasConflicts(merged.conflicts) ? merged.conflicts : undefined,
      };
    }

    const written = await putCmsState(merged.state);
    if (await keepIfLatest(written)) {
      return {
        ok: !hasConflicts(merged.conflicts),
        state: merged.state,
        etag: written.pathname,
        empty: false,
        conflicts: hasConflicts(merged.conflicts) ? merged.conflicts : undefined,
      };
    }
    stored = await readCmsState();
  }

  throw new Error("Kunde inte spara.");
}
