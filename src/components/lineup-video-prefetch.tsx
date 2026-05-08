"use client";

import { useCallback, useRef, useState } from "react";

function prefetchVideoClip(url: string, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "auto";
    v.muted = true;
    v.playsInline = true;
    v.style.cssText =
      "position:fixed;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;";

    let settled = false;
    const maxMs = 360_000;

    const settle = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(maxWait);
      signal.removeEventListener("abort", onAbort);
      v.removeAttribute("src");
      v.load();
      v.remove();
      if (ok) resolve();
      else reject(new Error("clip failed to load"));
    };

    const onAbort = () => settle(true);

    const maxWait = window.setTimeout(() => settle(true), maxMs);

    signal.addEventListener("abort", onAbort);
    v.addEventListener(
      "canplaythrough",
      () => {
        clearTimeout(maxWait);
        settle(true);
      },
      { once: true },
    );
    v.addEventListener(
      "error",
      () => {
        clearTimeout(maxWait);
        settle(false);
      },
      { once: true },
    );

    v.src = url;
    document.body.appendChild(v);
    v.load();
  });
}

export function LineupVideoPrefetch({
  clips,
}: {
  clips: { url: string; title: string }[];
}) {
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">(
    "idle",
  );
  const [index, setIndex] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setPhase("running");
    setIndex(0);

    try {
      for (let i = 0; i < clips.length; i++) {
        if (ac.signal.aborted) return;
        setIndex(i + 1);
        await prefetchVideoClip(clips[i]!.url, ac.signal);
        if (ac.signal.aborted) return;
      }
      if (!ac.signal.aborted) setPhase("done");
    } catch {
      if (!ac.signal.aborted) setPhase("error");
    }
  }, [clips]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setPhase("idle");
    setIndex(0);
  }, []);

  if (clips.length === 0) return null;

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium text-stone-200">
            Preload clips for smoother playback
          </p>
          <p className="text-xs leading-relaxed text-stone-500">
            Downloads each video in the background so your browser can cache it.
            Can take a while and uses a lot of bandwidth — especially on mobile.
            Your browser may still drop cached data if it needs memory.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {phase === "running" ? (
            <button
              type="button"
              onClick={cancel}
              className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-sm text-stone-200 hover:border-stone-500 hover:text-stone-50"
            >
              stop
            </button>
          ) : null}
          <button
            type="button"
            onClick={run}
            disabled={phase === "running"}
            className="rounded-lg bg-stone-200 px-4 py-2 text-sm font-medium text-stone-950 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {phase === "done" ? "preload again" : "preload all clips"}
          </button>
        </div>
      </div>
      {phase === "running" ? (
        <p className="mt-3 text-sm text-stone-400">
          Caching clip{" "}
          <span className="tabular-nums text-stone-300">{index}</span> /{" "}
          <span className="tabular-nums text-stone-300">{clips.length}</span>
          … leave this tab open.
        </p>
      ) : null}
      {phase === "done" ? (
        <p className="mt-3 text-sm text-emerald-200/90">
          Finished preloading {clips.length} clip
          {clips.length === 1 ? "" : "s"} — playback should start faster when you
          scrub or replay (browser-dependent).
        </p>
      ) : null}
      {phase === "error" ? (
        <p className="mt-3 text-sm text-amber-200/90">
          Something failed while loading a clip — try again, or check your
          connection / video URLs.
        </p>
      ) : null}
    </div>
  );
}
