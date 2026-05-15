import { logger } from "./logger";

const REPLICATE_MODEL = "nightmareai/real-esrgan";
const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20;

export async function upscaleImage(base64Image: string): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    logger.warn("REPLICATE_API_TOKEN not set — storing original image without upscaling");
    return base64Image;
  }

  try {
    const dataUrl = base64Image.startsWith("data:")
      ? base64Image
      : `data:image/png;base64,${base64Image}`;

    const createRes = await fetch(`https://api.replicate.com/v1/models/${REPLICATE_MODEL}/predictions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait=60",
      },
      body: JSON.stringify({
        input: { image: dataUrl, scale: 4, face_enhance: false },
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Replicate API error ${createRes.status}: ${errText}`);
    }

    type Prediction = { id: string; status: string; output?: string; error?: string };
    let prediction = await createRes.json() as Prediction;

    for (let i = 0; i < MAX_POLLS; i++) {
      if (prediction.status === "succeeded" && prediction.output) {
        const imgRes = await fetch(prediction.output);
        if (!imgRes.ok) throw new Error("Failed to download upscaled image from Replicate");
        const buffer = await imgRes.arrayBuffer();
        return `data:image/png;base64,${Buffer.from(buffer).toString("base64")}`;
      }
      if (prediction.status === "failed" || prediction.status === "canceled") {
        throw new Error(`Replicate prediction ${prediction.status}: ${prediction.error ?? ""}`);
      }
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!pollRes.ok) throw new Error(`Replicate poll error ${pollRes.status}`);
      prediction = await pollRes.json() as Prediction;
    }

    throw new Error("Upscaling timed out after polling");
  } catch (err) {
    logger.error({ err }, "Upscaling failed — falling back to original image");
    return base64Image;
  }
}
