import { Router, type IRouter } from "express";
import { db, stylesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { optionalAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/styles", async (_req, res): Promise<void> => {
  const styles = [
    {
      id: 1,
      slug: "cyberpunk-neon",
      label: "Cyberpunk Neon",
      description: "Futuristic city vibes, glowing neon lights, and dystopian cyberpunk aesthetics",
      icon: "⚡",
      promptParams: "cyberpunk aesthetic, neon lighting, dark background, futuristic cityscape, glowing elements, high contrast, digital art, chromatic aberration effects, purple and cyan color palette, ultra-detailed",
      sortOrder: 0,
      active: true
    },
    {
      id: 2,
      slug: "minimalismo-japones",
      label: "Minimalismo Japonês",
      description: "Zen simplicity, negative space, and wabi-sabi philosophy",
      icon: "🌸",
      promptParams: "japanese minimalism, wabi-sabi, zen composition, negative space, subtle ink brushwork, muted earth tones, single focal point, traditional Japanese aesthetics, elegant simplicity, ukiyo-e influence",
      sortOrder: 1,
      active: true
    },
    {
      id: 3,
      slug: "dark-rock-stipple",
      label: "Dark Rock Stipple",
      description: "Heavy metal meets fine art — intricate stipple illustration with dark rock energy",
      icon: "🤘",
      promptParams: "stipple illustration technique, dark rock aesthetic, black and white, crosshatching, heavy metal art style, skull motifs, intricate dot work, high contrast monochrome, concert poster art, woodcut style",
      sortOrder: 2,
      active: true
    }
  ];

  res.json(styles);
});

export default router;
