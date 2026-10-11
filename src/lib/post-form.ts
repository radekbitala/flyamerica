import { z } from "zod";

/**
 * Délky podle sloupců tabulky posts a post_categories. Počty galerií a fotek
 * a délka textu drží celý formulář pod limitem těla server action
 * (next.config.ts): fotka v galerii zabere ve formuláři asi 0,5-1,5 kB.
 * Popisek do 500 znaků a 30 galerií kvůli článkům ze starého webu (článek
 * 2017 má popisky přes 300 znaků, Oblet Ameriky 2016 má 17 galerií), aby
 * je Honza mohl v administraci upravit a uložit.
 */
export const POST_LIMITS = {
  title: 255,
  slug: 255,
  perex: 500,
  content: 500_000,
  imageAlt: 300,
  url: 500,
  caption: 500,
  categoryName: 100,
  galleries: 30,
  photosPerGallery: 60,
} as const;

export const UPLOADS_DISABLED_MESSAGE =
  "Nahrávání fotek zatím není nastavené, článek jde uložit bez nich.";

/** Adresa z názvu: bez diakritiky, malými písmeny, slova spojená spojovníkem. */
export function slugify(text: string): string {
  return slugifyLoose(text).replace(/^-+|-+$/g, "");
}

/**
 * Totéž při psaní do pole adresy. Spojovník na konci zůstává, jinak by
 * nešlo napsat "a-b": po "a-" by ho úprava hned smazala.
 */
export function slugifyLoose(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "");
}

/** Id galerie je součástí značky v textu, sanitizePostHtml jiné znaky zahodí. */
export const GALLERY_ID = /^[a-z0-9-]{1,40}$/;

// Cesta v bucketu, jak ji vrací nahrávací routa (2026/uuid.jpg). Volnější
// kvůli ukázkovým datům z scripts/local-db.mjs, jen bez "..".
const STORAGE_PATH = /^(?!.*\.\.)[a-z0-9][a-z0-9._/-]{0,200}$/;

const YOUTUBE_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "m.youtube.com",
  "youtu.be",
]);

function isYoutubeUrl(value: string): boolean {
  try {
    return YOUTUBE_HOSTS.has(new URL(value).hostname);
  } catch {
    return false;
  }
}

/** Prázdné pole formuláře = hodnota chybí. */
const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const dimension = z.coerce.number().int().positive().max(20000);

/** Rozbitý náhled nesmí shodit uložení, jen se zahodí. */
const blur = z
  .string()
  .startsWith("data:image/")
  .max(8000)
  .optional()
  .catch(undefined);

/**
 * Adresa fotky: http nebo https s libovolným hostem (z.httpUrl by nepustil
 * 127.0.0.1 s fotkami z migrace při vývoji). Odkud fotka smí být, hlídá
 * server action při uložení (isAllowedImageUrl v src/lib/image-hosts.ts).
 */
const imageUrl = z.url({ protocol: /^https?$/ }).max(POST_LIMITS.url);

const galleryItemSchema = z.object({
  path: z.string().regex(STORAGE_PATH),
  url: imageUrl,
  width: dimension,
  height: dimension,
  caption: z
    .string()
    .trim()
    .max(POST_LIMITS.caption, "Popisek fotky je příliš dlouhý."),
  // Administrace alt neupravuje, ale fotky převedené ze starého webu ho mají
  // (GalleryItem.alt). Bez něj by ho zod při uložení článku zahodil.
  alt: z.string().trim().max(POST_LIMITS.caption).optional().catch(undefined),
  blur,
});

const gallerySchema = z.object({
  id: z.string().regex(GALLERY_ID),
  items: z
    .array(galleryItemSchema)
    .max(POST_LIMITS.photosPerGallery, "Galerie má příliš mnoho fotek."),
});

const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message);

export const postSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Napište název článku.")
      .max(POST_LIMITS.title, "Název je příliš dlouhý."),
    slug: z
      .string()
      .trim()
      .min(1, "Adresa nesmí být prázdná.")
      .max(POST_LIMITS.slug, "Adresa je příliš dlouhá.")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Adresa smí mít jen malá písmena bez diakritiky, číslice a spojovníky.",
      ),
    perex: optionalText(POST_LIMITS.perex, "Perex je příliš dlouhý."),
    content: z
      .string()
      .max(POST_LIMITS.content, "Text článku je příliš dlouhý. Rozdělte ho do dvou článků."),
    imageUrl: z.preprocess(emptyToUndefined, imageUrl.optional()),
    imageWidth: dimension.optional().catch(undefined),
    imageHeight: dimension.optional().catch(undefined),
    imageBlur: blur,
    imageAlt: optionalText(POST_LIMITS.imageAlt, "Popis fotky je příliš dlouhý."),
    videoUrl: z.preprocess(
      emptyToUndefined,
      z
        .httpUrl("Vložte odkaz na video z YouTube.")
        .max(POST_LIMITS.url, "Odkaz je příliš dlouhý.")
        .refine(isYoutubeUrl, "Vložte odkaz na video z YouTube.")
        .optional(),
    ),
    gallery: z
      .array(gallerySchema)
      .max(POST_LIMITS.galleries, "Článek má příliš mnoho galerií.")
      .refine(
        (galleries) => new Set(galleries.map((g) => g.id)).size === galleries.length,
        "Dvě galerie mají stejné označení. Načtěte stránku znovu.",
      ),
    categoryIds: z.array(z.uuid()).max(50),
    newCategories: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(POST_LIMITS.categoryName, "Název kategorie je příliš dlouhý.")
          .refine(
            (name) => slugify(name) !== "",
            "Název kategorie musí obsahovat písmeno nebo číslici.",
          ),
      )
      .max(10),
    status: z.enum(["draft", "published"]),
  })
  .superRefine((data, ctx) => {
    if (data.imageUrl && !data.imageAlt) {
      ctx.addIssue({
        code: "custom",
        path: ["imageAlt"],
        message: "Popište titulní fotku. Text čtou nevidomí a vyhledávače.",
      });
    }
  });

export type PostInput = z.infer<typeof postSchema>;

export type PostFormState = {
  status: "idle" | "error";
  fieldErrors?: Record<string, string>;
  formError?: string;
};
