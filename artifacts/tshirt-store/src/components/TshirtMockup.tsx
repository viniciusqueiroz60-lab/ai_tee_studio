import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TshirtMockupProps {
  artworkUrl: string;
  color: string;
  mockupUrl?: string | null;
  altText?: string;
  showDownload?: boolean;
}

export interface TshirtMockupHandle {
  getDataUrl: () => string | null;
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

const CANVAS_W = 600;
const CANVAS_H = 700;

function buildTshirtPath2D(w: number, h: number): Path2D {
  const cx = w / 2;
  const neckR = w * 0.12;
  const shoulderDrop = h * 0.12;
  const sleeveW = w * 0.18;
  const sleeveH = h * 0.24;
  const bodyTop = h * 0.16;
  const bodyBot = h * 0.96;

  const d = [
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

  return new Path2D(d);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawFallbackShirt(
  canvas: HTMLCanvasElement,
  hexColor: string,
  isDark: boolean
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 8;
  const path = buildTshirtPath2D(W, H);
  ctx.fillStyle = hexColor;
  ctx.fill(path);
  ctx.strokeStyle = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.10)";
  ctx.lineWidth = 2;
  ctx.stroke(path);
  ctx.restore();
}

async function drawWithModelTemplate(
  canvas: HTMLCanvasElement,
  artworkUrl: string,
  mockupUrl: string,
  hexColor: string,
  isDark: boolean
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const templateImg = await loadImage(mockupUrl);
  ctx.drawImage(templateImg, 0, 0, W, H);

  if (hexColor !== COLOR_HEX["white"]) {
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = hexColor;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  const artworkImg = await loadImage(artworkUrl);
  ctx.save();
  const artX = W * 0.28;
  const artY = H * 0.26;
  const artW = W * 0.44;
  const artH = H * 0.44;
  const clipRect = new Path2D();
  clipRect.roundRect(artX, artY, artW, artH, 8);
  ctx.clip(clipRect);
  ctx.globalCompositeOperation = isDark ? "screen" : "multiply";
  ctx.drawImage(artworkImg, artX, artY, artW, artH);
  ctx.restore();
}

async function drawWithGeneratedShirt(
  canvas: HTMLCanvasElement,
  artworkUrl: string,
  hexColor: string,
  isDark: boolean
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 8;
  const path = buildTshirtPath2D(W, H);
  ctx.fillStyle = hexColor;
  ctx.fill(path);
  ctx.strokeStyle = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.10)";
  ctx.lineWidth = 2;
  ctx.stroke(path);
  ctx.restore();

  const artworkImg = await loadImage(artworkUrl);
  ctx.save();
  const artX = W * 0.28;
  const artY = H * 0.26;
  const artW = W * 0.44;
  const artH = H * 0.44;
  const clipRect = new Path2D();
  clipRect.roundRect(artX, artY, artW, artH, 8);
  ctx.clip(clipRect);
  ctx.globalCompositeOperation = isDark ? "screen" : "multiply";
  ctx.drawImage(artworkImg, artX, artY, artW, artH);
  ctx.restore();
}

export const TshirtMockup = forwardRef<TshirtMockupHandle, TshirtMockupProps>(
  function TshirtMockup({ artworkUrl, color, mockupUrl, altText, showDownload = false }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [rendered, setRendered] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const hexColor = COLOR_HEX[color] ?? color;
    const isDark = ["black", "charcoal", "navy"].includes(color);

    const render = useCallback(async () => {
      const canvas = canvasRef.current;
      if (!canvas || !artworkUrl) return;

      setRendered(false);
      try {
        if (mockupUrl) {
          await drawWithModelTemplate(canvas, artworkUrl, mockupUrl, hexColor, isDark);
        } else {
          await drawWithGeneratedShirt(canvas, artworkUrl, hexColor, isDark);
        }
      } catch {
        drawFallbackShirt(canvas, hexColor, isDark);
      }
      setRendered(true);
    }, [artworkUrl, mockupUrl, hexColor, isDark]);

    useEffect(() => {
      render();
    }, [render]);

    useImperativeHandle(ref, () => ({
      getDataUrl: () => {
        try {
          const canvas = canvasRef.current;
          if (!canvas || !rendered) return null;
          return canvas.toDataURL("image/png");
        } catch {
          return null;
        }
      },
    }));

    function handleDownload() {
      const canvas = canvasRef.current;
      if (!canvas || !rendered) return;
      setDownloading(true);
      try {
        const dataUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `camiseta-mockup-${color}.png`;
        a.click();
      } catch {
        // Canvas taint (cross-origin image) — silently ignore
      } finally {
        setDownloading(false);
      }
    }

    return (
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-muted/30 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          aria-label={altText ?? "Camiseta"}
          className="w-full h-full object-contain"
          style={{ opacity: rendered ? 1 : 0, transition: "opacity 0.2s" }}
        />
        {!rendered && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          </div>
        )}
        {showDownload && rendered && (
          <div className="absolute bottom-3 right-3">
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5 shadow-md backdrop-blur-sm bg-background/80 hover:bg-background"
              onClick={handleDownload}
              disabled={downloading}
            >
              <Download className="w-4 h-4" />
              Baixar mockup
            </Button>
          </div>
        )}
      </div>
    );
  }
);
