import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { eq } from "drizzle-orm";
import { pgTable, text, serial, boolean, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const stylesTable = pgTable("styles", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  description: text("description"),
  icon: text("icon"),
  promptParams: text("prompt_params").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

const tshirtModelsTable = pgTable("tshirt_models", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  mockupUrl: text("mockup_url"),
  availableColors: text("available_colors").array().notNull().default([]),
  active: boolean("active").notNull().default(true),
  price: doublePrecision("price").notNull().default(49.90),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

const styles = [
  {
    slug: "cyberpunk-neon",
    label: "Cyberpunk Neon",
    description: "Futuristic city vibes, glowing neon lights, and dystopian cyberpunk aesthetics",
    icon: "⚡",
    promptParams: "cyberpunk aesthetic, neon lighting, dark background, futuristic cityscape, glowing elements, high contrast, digital art, chromatic aberration effects, purple and cyan color palette, ultra-detailed",
    sortOrder: 0,
  },
  {
    slug: "minimalismo-japones",
    label: "Minimalismo Japonês",
    description: "Zen simplicity, negative space, and wabi-sabi philosophy",
    icon: "🌸",
    promptParams: "japanese minimalism, wabi-sabi, zen composition, negative space, subtle ink brushwork, muted earth tones, single focal point, traditional Japanese aesthetics, elegant simplicity, ukiyo-e influence",
    sortOrder: 1,
  },
  {
    slug: "dark-rock-stipple",
    label: "Dark Rock Stipple",
    description: "Heavy metal meets fine art — intricate stipple illustration with dark rock energy",
    icon: "🤘",
    promptParams: "stipple illustration technique, dark rock aesthetic, black and white, crosshatching, heavy metal art style, skull motifs, intricate dot work, high contrast monochrome, concert poster art, woodcut style",
    sortOrder: 2,
  },
  {
    slug: "vaporwave-retro",
    label: "Vaporwave Retro",
    description: "80s nostalgia, pastel grids, and digital dreamscapes",
    icon: "🌴",
    promptParams: "vaporwave aesthetic, synthwave, retrowave, pink and purple gradient, 80s retro, digital sunset, grid perspective, glitch art, palm trees silhouette, lo-fi nostalgia, pastel colors",
    sortOrder: 3,
  },
  {
    slug: "vector-pop-art",
    label: "Vector Pop Art",
    description: "Bold colors, flat vector shapes, and pop art impact",
    icon: "🎨",
    promptParams: "pop art style, bold vector illustration, flat colors, Roy Lichtenstein influence, comic book aesthetic, halftone dots, bold outlines, limited color palette, graphic design, Andy Warhol influence",
    sortOrder: 4,
  },
];

const models = [
  {
    name: "Classic Tee",
    description: "100% cotton, premium quality, unisex fit",
    availableColors: ["white", "black", "gray", "navy", "red"],
    price: 49.90,
  },
  {
    name: "Premium Fitted",
    description: "Slim-cut, 100% combed cotton, preshrunk",
    availableColors: ["white", "black", "charcoal"],
    price: 64.90,
  },
  {
    name: "Oversize Drop",
    description: "Relaxed oversized fit, heavyweight 220g fabric",
    availableColors: ["white", "black", "sand", "sage"],
    price: 79.90,
  },
];

async function seed() {
  console.log("Seeding styles...");
  for (const style of styles) {
    const existing = await db.select().from(stylesTable).where(eq(stylesTable.slug, style.slug));
    if (existing.length === 0) {
      await db.insert(stylesTable).values(style);
      console.log(`  Inserted style: ${style.label}`);
    } else {
      await db.update(stylesTable).set({ ...style, updatedAt: new Date() }).where(eq(stylesTable.slug, style.slug));
      console.log(`  Updated style: ${style.label}`);
    }
  }

  console.log("Seeding t-shirt models...");
  for (const model of models) {
    const existing = await db.select().from(tshirtModelsTable).where(eq(tshirtModelsTable.name, model.name));
    if (existing.length === 0) {
      await db.insert(tshirtModelsTable).values(model);
      console.log(`  Inserted model: ${model.name}`);
    } else {
      console.log(`  Skipped model (exists): ${model.name}`);
    }
  }

  console.log("Done!");
  await pool.end();
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
