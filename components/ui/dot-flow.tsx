"use client";

import { useEffect, useRef, useState } from "react";
import { DotLoader } from "@/components/ui/dot-loader";

export type DotFlowItem = {
  title: string;
  frames: number[][];
  duration?: number;
  repeatCount?: number;
};

export function DotFlow({ items }: { items: DotFlowItem[] }) {
  const [itemIndex,  setItemIndex]  = useState(0);
  const [frameIndex, setFrameIndex] = useState(0);
  const [textKey,    setTextKey]    = useState(0); // bump to retrigger fade-in

  // Keep latest items in a ref so the rAF loop never goes stale
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    let raf = 0;
    let lastStep = performance.now();

    // local mutable cursor — survives re-renders within this single effect run
    let item = 0;
    let frame = 0;
    let repeats = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);

      const list = itemsRef.current;
      const cur = list[item];
      const stepMs = cur.duration ?? 150;

      if (now - lastStep < stepMs) return;
      lastStep = now;

      frame += 1;

      if (frame >= cur.frames.length) {
        // one full cycle done
        frame = 0;
        repeats += 1;
        const target = cur.repeatCount ?? 1;
        if (repeats >= target) {
          // advance to next item (loop forever)
          repeats = 0;
          item = (item + 1) % list.length;
          setItemIndex(item);
          setTextKey((k) => k + 1);
        }
      }

      setFrameIndex(frame);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []); // single self-contained loop; StrictMode re-run just restarts it

  const current = items[itemIndex] ?? items[0];
  const activeFrame = current.frames[frameIndex] ?? current.frames[0] ?? [];

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 999,
        padding: "8px 16px",
        backdropFilter: "blur(8px)",
      }}
    >
      <DotLoader active={activeFrame} />
      <span
        key={textKey}
        className="dot-text-in"
        style={{
          fontSize: 12.5,
          fontWeight: 500,
          letterSpacing: "0.01em",
          color: "rgba(255,255,255,0.7)",
          whiteSpace: "nowrap",
        }}
      >
        {current.title}
      </span>
    </div>
  );
}
