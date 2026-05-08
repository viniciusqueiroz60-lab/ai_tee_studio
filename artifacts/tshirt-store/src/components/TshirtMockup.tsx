import { useState } from "react";

interface TshirtMockupProps {
  artworkUrl: string;
  color: string;
  mockupUrl?: string | null;
  altText?: string;
}

const COLOR_HEX: Record<string, string> = {
  white: "#F5F5F0",
  black: "#1a1a1a",
  gray: "#9ca3af",
  charcoal: "#374151",
  navy: "#1e3a5f",
  red: "#ef4444",
  sand: "#d4c5a9",
  sage: "#87a878",
};

function tshirtPath(w: number, h: number) {
  const cx = w / 2;
  const neckR = w * 0.12;
  const shoulderDrop = h * 0.12;
  const sleeveW = w * 0.18;
  const sleeveH = h * 0.24;
  const bodyTop = h * 0.16;
  const bodyBot = h * 0.96;

  return [
    `M ${cx - neckR * 2.5},0`,
    `Q ${cx - neckR},0 ${cx - neckR},${neckR * 0.8}`,
    `A ${neckR} ${neckR * 0.7} 0 0 0 ${cx + neckR} ${neckR * 0.8}`,
    `Q ${cx + neckR},0 ${cx + neckR * 2.5},0`,
    `L ${cx + w * 0.5 - sleeveW},${shoulderDrop}`,
    `L ${cx + w * 0.5},${shoulderDrop + sleeveH}`,
    `L ${cx + w * 0.5 - sleeveW},${bodyTop}`,
    `L ${cx + w * 0.5 - sleeveW},${bodyBot}`,
    `L ${cx - w * 0.5 + sleeveW},${bodyBot}`,
    `L ${cx - w * 0.5 + sleeveW},${bodyTop}`,
    `L ${cx - w * 0.5},${shoulderDrop + sleeveH}`,
    `L ${cx - w * 0.5 + sleeveW},${shoulderDrop}`,
    "Z",
  ].join(" ");
}

export function TshirtMockup({ artworkUrl, color, mockupUrl, altText }: TshirtMockupProps) {
  const [imgError, setImgError] = useState(false);
  const hexColor = COLOR_HEX[color] ?? color;
  const isDark = ["black", "charcoal", "navy"].includes(color);

  if (mockupUrl && !imgError) {
    return (
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-muted flex items-center justify-center">
        <img
          src={mockupUrl}
          alt={altText ?? "Camiseta"}
          className="w-full h-full object-contain"
          onError={() => setImgError(true)}
        />
        <div
          className="absolute"
          style={{
            top: "26%",
            left: "30%",
            width: "40%",
            aspectRatio: "1",
          }}
        >
          <img
            src={artworkUrl}
            alt="Design"
            className="w-full h-full object-contain"
            style={{ mixBlendMode: isDark ? "screen" : "multiply" }}
          />
        </div>
      </div>
    );
  }

  const W = 320;
  const H = 380;

  return (
    <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-muted/30 flex items-center justify-center">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full max-w-xs" aria-label={altText ?? "Camiseta"}>
        <defs>
          <filter id="tshirt-shadow">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="rgba(0,0,0,0.15)" />
          </filter>
          <clipPath id="artwork-clip">
            <rect x={W * 0.28} y={H * 0.26} width={W * 0.44} height={H * 0.44} rx="6" />
          </clipPath>
        </defs>

        <path
          d={tshirtPath(W, H)}
          fill={hexColor}
          stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}
          strokeWidth="1.5"
          filter="url(#tshirt-shadow)"
        />

        <image
          href={artworkUrl}
          x={W * 0.28}
          y={H * 0.26}
          width={W * 0.44}
          height={H * 0.44}
          clipPath="url(#artwork-clip)"
          preserveAspectRatio="xMidYMid meet"
          style={{ mixBlendMode: isDark ? "screen" : "multiply" }}
        />
      </svg>
    </div>
  );
}
