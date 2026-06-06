"use client";

interface DotLoaderProps {
  /** Indices (0–48) that should be lit */
  active: number[];
}

/**
 * Purely presentational 7×7 dot grid.
 * All timing/animation is driven by the parent (DotFlow).
 */
export function DotLoader({ active }: DotLoaderProps) {
  const set = new Set(active);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 3px)",
        gap: 3,
        width: "fit-content",
      }}
    >
      {Array.from({ length: 49 }).map((_, i) => {
        const on = set.has(i);
        // arrange the 7×7 grid into a circular "screen"
        const row = Math.floor(i / 7);
        const col = i % 7;
        const dist = Math.hypot(row - 3, col - 3);
        const inside = dist <= 3.4; // hide corners → round shape
        return (
          <div
            key={i}
            style={{
              width: 3,
              height: 3,
              borderRadius: 999,
              backgroundColor: on ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.08)",
              transform: on ? "scale(1.15)" : "scale(1)",
              opacity: inside ? 1 : 0,
              transition: "background-color 220ms ease, transform 220ms ease",
            }}
          />
        );
      })}
    </div>
  );
}
