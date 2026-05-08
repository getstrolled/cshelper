"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type View = { scale: number; tx: number; ty: number };

const MIN_SCALE = 1;
const MAX_SCALE = 10;

type Props = {
  src: string;
  alt: string;
};

export function ZoomableRadarImage({ src, alt }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ scale: 1, tx: 0, ty: 0 });
  const [lightbox, setLightbox] = useState(false);
  const panRef = useRef<{ cx: number; cy: number; tx: number; ty: number } | null>(
    null,
  );

  useEffect(() => {
    if (!lightbox) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox]);

  const applyWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const zoomOut = e.deltaY > 0;
    const factor = zoomOut ? 1 / 1.12 : 1.12;

    setView((prev) => {
      let newScale = prev.scale * factor;
      newScale = Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE);
      if (newScale <= MIN_SCALE + 1e-6) {
        return { scale: 1, tx: 0, ty: 0 };
      }
      const cx = (mx - prev.tx) / prev.scale;
      const cy = (my - prev.ty) / prev.scale;
      return {
        scale: newScale,
        tx: mx - cx * newScale,
        ty: my - cy * newScale,
      };
    });
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.addEventListener("wheel", applyWheel, { passive: false });
    return () => el.removeEventListener("wheel", applyWheel);
  }, [applyWheel]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      if (view.scale <= 1) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      panRef.current = {
        cx: e.clientX,
        cy: e.clientY,
        tx: view.tx,
        ty: view.ty,
      };
      e.preventDefault();
    },
    [view.scale, view.tx, view.ty],
  );

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const p = panRef.current;
    if (!p) return;
    setView((prev) => ({
      ...prev,
      tx: p.tx + (e.clientX - p.cx),
      ty: p.ty + (e.clientY - p.cy),
    }));
  }, []);

  const endPan = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      /* noop */
    }
    panRef.current = null;
  }, []);

  const reset = useCallback(() => {
    setView({ scale: 1, tx: 0, ty: 0 });
  }, []);

  const openLightbox = useCallback(() => {
    setLightbox(true);
  }, []);

  const { scale, tx, ty } = view;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap justify-end gap-2 text-xs">
        <button
          type="button"
          onClick={openLightbox}
          className="rounded border border-stone-600 px-2 py-1 text-stone-400 hover:border-stone-500 hover:text-stone-200"
        >
          enlarge
        </button>
        {scale > 1 ? (
          <button
            type="button"
            onClick={reset}
            className="rounded border border-stone-600 px-2 py-1 text-stone-400 hover:border-stone-500 hover:text-stone-200"
          >
            reset zoom
          </button>
        ) : null}
      </div>
      <div
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onClick={() => {
          if (scale <= 1) openLightbox();
        }}
        className={`relative max-h-[min(85vh,1200px)] touch-none overflow-hidden rounded-lg border border-stone-800 bg-black select-none ${
          scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
        }`}
        style={{ overscrollBehavior: "none" }}
      >
        <div
          style={{
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transformOrigin: "0 0",
            willChange: "transform",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- zoom uses intrinsic layout */}
          <img
            src={src}
            alt={alt}
            className="block h-auto w-full max-w-none"
            draggable={false}
          />
        </div>
      </div>

      {lightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Callouts image full size"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(false);
            }}
            className="absolute right-4 top-4 rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-sm text-stone-200 hover:bg-stone-900"
          >
            close
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-h-[95vh] max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        </div>
      ) : null}
    </div>
  );
}
