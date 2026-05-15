const BASE_URL = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

async function apiFetch(path: string, body: object): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "API error");
  }
  return res.json();
}

export async function generateDesignPrompt(
  userConcept: string,
  enrichment: string,
  technicalConstraints: string
): Promise<string> {
  const data = await apiFetch("/ai-studio/generate-prompt", {
    concept: userConcept,
    enrichment,
    technicalConstraints,
  });
  return (data as { technicalPrompt: string }).technicalPrompt;
}

export async function generateDesignImage(prompt: string): Promise<string> {
  const data = await apiFetch("/ai-studio/generate-image", { prompt });
  return (data as { imageUrl: string }).imageUrl;
}

export async function refineDesignImage(
  originalImageBase64: string,
  modificationPrompt: string
): Promise<string> {
  const data = await apiFetch("/ai-studio/refine", {
    imageBase64: originalImageBase64,
    modificationPrompt,
  });
  return (data as { imageUrl: string }).imageUrl;
}
