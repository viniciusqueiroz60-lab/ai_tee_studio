import { logger } from "./logger";

const ESRGAN_VERSION = "f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa";
const REMBG_OWNER = "cjwbw";
const REMBG_MODEL = "rembg";
const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20;

type Prediction = { id: string; status: string; output?: string; error?: string };

async function pollPrediction(predictionId: string, token: string): Promise<string> {
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Poll error ${res.status}`);
    const p = await res.json() as Prediction;
    if (p.status === "succeeded" && p.output) return p.output;
    if (p.status === "failed" || p.status === "canceled") {
      throw new Error(`Prediction ${p.status}: ${p.error ?? ""}`);
    }
  }
  throw new Error("Prediction timed out after polling");
}

// Step 1: Upscale image via Real-ESRGAN, returns a Replicate CDN URL (not base64)
async function upscaleToUrl(imageInput: string, token: string): Promise<string> {
  const createRes = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",
    },
    body: JSON.stringify({
      version: ESRGAN_VERSION,
      input: { image: imageInput, scale: 4, face_enhance: false },
    }),
  });
  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`ESRGAN API error ${createRes.status}: ${errText}`);
  }
  const p = await createRes.json() as Prediction;
  if (p.status === "succeeded" && p.output) return p.output;
  if (p.status === "failed" || p.status === "canceled") {
    throw new Error(`ESRGAN ${p.status}: ${p.error ?? ""}`);
  }
  return pollPrediction(p.id, token);
}

// Step 2: Remove background via rembg, accepts a CDN URL and returns a transparent PNG URL
async function removeBgToUrl(imageUrl: string, token: string): Promise<string> {
  const createRes = await fetch(
    `https://api.replicate.com/v1/models/${REMBG_OWNER}/${REMBG_MODEL}/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait=60",
      },
      body: JSON.stringify({
        input: { image: imageUrl },
      }),
    }
  );
  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`rembg API error ${createRes.status}: ${errText}`);
  }
  const p = await createRes.json() as Prediction;
  if (p.status === "succeeded" && p.output) return p.output;
  if (p.status === "failed" || p.status === "canceled") {
    throw new Error(`rembg ${p.status}: ${p.error ?? ""}`);
  }
  return pollPrediction(p.id, token);
}

// Download a URL and encode as base64 data URL
async function downloadAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = await res.arrayBuffer();
  return `data:image/png;base64,${Buffer.from(buffer).toString("base64")}`;
}

export interface ProcessedArtwork {
  dataUrl: string;
  upscaled: boolean;
  bgRemoved: boolean;
}

/**
 * Full DTF pipeline: upscale 4x with Real-ESRGAN then remove background with rembg.
 * Each step fails gracefully — if upscaling fails the original is used;
 * if background removal fails the upscaled (or original) image is returned.
 * Final result is always a PNG with a transparent background when both steps succeed.
 */
export async function processArtworkForDTF(imageInput: string): Promise<ProcessedArtwork> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    logger.warn("REPLICATE_API_TOKEN not set — returning original image without processing");
    const dataUrl = imageInput.startsWith("http")
      ? await downloadAsBase64(imageInput).catch(() => imageInput)
      : imageInput;
    return { dataUrl, upscaled: false, bgRemoved: false };
  }

  // --- Step 1: Upscale ---
  let workingUrl: string = imageInput;
  let upscaled = false;
  try {
    workingUrl = await upscaleToUrl(imageInput, token);
    upscaled = true;
    logger.info("DTF pipeline: upscaling succeeded");
  } catch (err) {
    logger.error({ err }, "DTF pipeline: upscaling failed — continuing with original image");
  }

  // --- Step 2: Remove background ---
  let bgRemoved = false;
  let finalUrl: string = workingUrl;
  try {
    finalUrl = await removeBgToUrl(workingUrl, token);
    bgRemoved = true;
    logger.info("DTF pipeline: background removal succeeded");
  } catch (err) {
    logger.error({ err }, "DTF pipeline: background removal failed — keeping image with original background");
  }

  // --- Step 3: Download final PNG ---
  try {
    const dataUrl = await downloadAsBase64(finalUrl);
    return { dataUrl, upscaled, bgRemoved };
  } catch (err) {
    logger.error({ err }, "DTF pipeline: failed to download final image — falling back to input");
    return { dataUrl: imageInput, upscaled: false, bgRemoved: false };
  }
}

/**
 * Legacy export kept for backward compatibility with any code that calls
 * upscaleImage directly (without background removal).
 */
export async function upscaleImage(imageInput: string): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    logger.warn("REPLICATE_API_TOKEN not set — returning original image without upscaling");
    return imageInput;
  }
  try {
    const upscaledUrl = await upscaleToUrl(imageInput, token);
    return downloadAsBase64(upscaledUrl);
  } catch (err) {
    logger.error({ err, imageInputPreview: imageInput.slice(0, 120) }, "Upscaling failed — falling back to original image");
    return imageInput;
  }
}
