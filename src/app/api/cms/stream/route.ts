import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/cms/admin-session";
import { readCmsEtag } from "@/lib/cms/blob-store";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const POLL_MS = 1000;

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Logga in för att redigera." }, { status: 401 });
  }

  const encoder = new TextEncoder();
  let last: string | null | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => {
        controller.enqueue(encoder.encode(chunk));
      };

      try {
        while (!request.signal.aborted) {
          try {
            const etag = await readCmsEtag();
            if (etag !== last) {
              last = etag;
              send(`data: ${JSON.stringify({ etag })}\n\n`);
            } else {
              send(": ping\n\n");
            }
          } catch {
            send(": ping\n\n");
          }
          await sleep(POLL_MS, request.signal);
        }
      } catch {
        // Client disconnected or the stream was cancelled.
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
