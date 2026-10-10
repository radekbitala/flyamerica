import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  smallint,
  integer,
  jsonb,
  pgEnum,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

// Všechny tabulky mají zapnuté RLS bez politik. Supabase vystavuje schéma
// public přes PostgREST a s veřejným klíčem projektu by k tabulkám mohl
// kdokoli. Aplikace se připojuje jako vlastník tabulek (role postgres,
// bypassrls), takže ji RLS neomezuje, a role anon a authenticated nedostanou
// nic. Každá nová tabulka musí .enableRLS() mít taky.

// Enums
export const postStatusEnum = pgEnum("post_status", [
  "draft",
  "published",
  "archived",
]);

// Admin users
export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("admin"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  /**
   * Zvyšuje se při změně hesla (scripts/create-admin.mjs). Přihlášení nese
   * verzi z doby přihlášení a requireAdmin() ji porovnává, takže po změně
   * hesla přestanou platit všechna dřívější přihlášení.
   */
  sessionVersion: integer("session_version").notNull().default(1),
}).enableRLS();

/**
 * Pokusy o přihlášení podle otisku IP (src/lib/login-limit.ts). Úspěšné
 * přihlášení záznamy své IP smaže, zůstávají jen neúspěšné pokusy.
 */
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ipHash: varchar("ip_hash", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("login_attempts_ip_hash_created_at_idx").on(table.ipHash, table.createdAt)],
).enableRLS();

// ---------------------------------------------------------------------------
// Deník
// ---------------------------------------------------------------------------

/** Jedna fotka v galerii článku. */
export interface GalleryItem {
  /** Cesta v bucketu "denik", podle ní se soubor po smazání uklidí. */
  path: string;
  url: string;
  width: number;
  height: number;
  caption: string;
  /** Malý data URL náhled pro rozmazaný placeholder. */
  blur?: string;
}

/**
 * Galerie článku. V textu článku ji zastupuje značka
 * <p data-gallery="ID"></p>, kde ID je tohle id.
 */
export interface PostGallery {
  /** Jen [a-z0-9-], jinak by značku v textu odstranil sanitizePostHtml. */
  id: string;
  /** Pořadí fotek = pořadí v poli. */
  items: GalleryItem[];
}

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  perex: varchar("perex", { length: 500 }),
  content: text("content").notNull(),
  imageUrl: varchar("image_url", { length: 500 }),
  imageWidth: integer("image_width"),
  imageHeight: integer("image_height"),
  imageBlur: text("image_blur"),
  imageAlt: varchar("image_alt", { length: 300 }),
  videoUrl: varchar("video_url", { length: 500 }),
  /**
   * Pole galerií, ne jedna plochá galerie. Cestopis rozdělený po dnech
   * přeletu může mít galerii u každého dne, tedy víc galerií na různých
   * místech textu. Text na ně odkazuje značkou s id, ne pořadím, takže se
   * odstavce dají v editoru přesouvat, aniž by se sahalo na fotky. Galerie
   * se čtou a ukládají vždy s článkem, proto jsonb místo vlastní tabulky.
   */
  gallery: jsonb("gallery").$type<PostGallery[]>().notNull().default([]),
  status: postStatusEnum("status").notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  createdBy: uuid("created_by").references(() => adminUsers.id, {
    onDelete: "set null",
  }),
}).enableRLS();

// Post categories
export const postCategories = pgTable("post_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  sortOrder: smallint("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}).enableRLS();

// Post <-> Category M:N
export const postCategoryMap = pgTable(
  "post_category_map",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => postCategories.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.postId, table.categoryId] })],
).enableRLS();

// ---------------------------------------------------------------------------
// Poptávky
// ---------------------------------------------------------------------------

export const inquiryStatusEnum = pgEnum("inquiry_status", [
  "new",
  "in_progress",
  "done",
  "archived",
]);

/**
 * Stránka Kontakt má dva formuláře: poptávku na tři kroky a krátké
 * „Nechte číslo, zavolám" (jen jméno a telefon). Oba končí tady, proto jsou
 * sloupce kromě jména nepovinné a povinnost hlídá validace formuláře.
 */
export const inquiryKindEnum = pgEnum("inquiry_kind", ["inquiry", "callback"]);

export const inquiries = pgTable(
  "inquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: inquiryKindEnum("kind").notNull().default("inquiry"),

    // Krok 1: licence a zkušenosti
    /** PPL, CPL/ATPL, Ultralight, Jiná, Nemám. */
    licence: varchar("licence", { length: 40 }),
    /** Pole „Pár slov o vás": nálet, na čem létá, co od Floridy čeká. */
    aboutPilot: text("about_pilot"),

    // Krok 2: balíček a termín
    /**
     * Hodnota z formuláře (florida-week, grand-tour, nevim). Řetězec, ne
     * enum: balíčky žijí na webu a třetí ještě přibude.
     */
    packageSlug: varchar("package_slug", { length: 60 }),
    /** Volný text, formulář chce jen měsíc nebo rozmezí. */
    travelDate: varchar("travel_date", { length: 120 }),
    /** 1, 2, 3 a víc. */
    pilotCount: varchar("pilot_count", { length: 20 }),
    /** Doprovod, který nebude pilotovat: Ano, Ne, Ještě nevím. */
    companions: varchar("companions", { length: 20 }),

    // Krok 3: kontakt
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 40 }),
    /** Odkud o nás ví (výběr z formuláře). */
    referralSource: varchar("referral_source", { length: 100 }),
    message: text("message"),
    // Formulář souhlas nesbírá (rozhodnutí 10. 10. 2026, viz
    // src/lib/inquiries/schema.ts). Sloupce zůstávají pro případ, že by se
    // zaškrtávátko vrátilo.
    consent: boolean("consent").notNull().default(false),
    consentAt: timestamp("consent_at", { withTimezone: true }),

    status: inquiryStatusEnum("status").notNull().default("new"),
    internalNote: text("internal_note"),

    // Otisk IP (sha256 se solí IP_HASH_SALT) kvůli omezení četnosti.
    // Samotnou IP neukládáme, k vyřízení poptávky ji nepotřebujeme.
    ipHash: varchar("ip_hash", { length: 64 }),
    userAgent: varchar("user_agent", { length: 500 }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Administrace filtruje podle stavu a řadí podle data.
    index("inquiries_status_idx").on(table.status),
    index("inquiries_created_at_idx").on(table.createdAt),
  ],
).enableRLS();
