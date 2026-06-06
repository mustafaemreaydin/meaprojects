import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "full" | "mark";
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Force white version (for always-dark backgrounds) */
  light?: boolean;
}

const sizeMap: Record<string, number> = {
  sm: 24,
  md: 32,
  lg: 40,
};

export function Logo({ size = "md", className, light }: LogoProps) {
  const h = sizeMap[size];

  if (light) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/mea-white.png"
        alt="mea"
        style={{ height: h, width: "auto", display: "block", maxHeight: h }}
        className={cn(className)}
      />
    );
  }

  return (
    <span
      className={cn("inline-block", className)}
      style={{ height: h, lineHeight: 0 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mea-dark.png"
        alt="mea"
        style={{ height: h, width: "auto", maxHeight: h, display: "block" }}
        className="logo-light"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mea-white.png"
        alt="mea"
        style={{ height: h, width: "auto", maxHeight: h, display: "none" }}
        className="logo-dark"
      />
    </span>
  );
}
