import "server-only";
import type { PostGallery } from "@/lib/db/schema";
import type { PublicPost } from "@/lib/public-posts";
import { sanitizePostHtml } from "@/lib/sanitize";
import { czechNbsp } from "@/lib/typography";

/**
 * Text článku pro vykreslení na webu (src/app/(web)/z-cest/[slug]).
 *
 * HTML z databáze se před vykreslením znovu vyčistí (sanitizePostHtml),
 * doplní se pevné mezery (czechNbsp) a rozloží se na strom uzlů. Stránka ho
 * pak skládá z Reactu, ne přes dangerouslySetInnerHTML, takže fotky jdou přes
 * next/image, značka <p data-gallery="ID"></p> se nahradí galerií a video
 * z YouTube je odkaz „Video na YouTube“ (jako model, přehrávač se nevkládá).
 *
 * Parser počítá jen s výstupem sanitizePostHtml: uzavřené značky, atributy
 * v uvozovkách, z entit jen &amp; &lt; &gt; &quot;. Na libovolné HTML není.
 */

export interface HtmlText {
  type: "text";
  text: string;
}

export interface HtmlElement {
  type: "element";
  tag: string;
  attrs: Record<string, string>;
  children: HtmlNode[];
}

export type HtmlNode = HtmlText | HtmlElement;

export interface TocEntry {
  id: string;
  text: string;
}

export interface ArticleBody {
  /** Text článku do .prose. Galerie uprostřed textu zůstávají jako značky. */
  nodes: HtmlNode[];
  /** Galerie za posledním odstavcem: na webu vlastní sekce Fotky pod článkem (jako model). */
  trailingGalleries: PostGallery[];
  /** Galerie článku podle id ze značky v textu (jen s aspoň jednou fotkou). */
  galleries: Map<string, PostGallery>;
  /** Obsah článku „V článku“: nadpisy s doplněným id. Prázdný, když jsou méně než dva. */
  toc: TocEntry[];
  /**
   * Podtitul článku: jediný nadpis své úrovně hned před prvním odstavcem
   * (článek 2017 Druhý přelet Atlantiku). Z textu je vyjmutý, stránka ho
   * ukáže v záhlaví místo perexu jako model. S pevnými mezerami, jinak null.
   */
  subtitle: string | null;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

const TOKEN = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|[^<]+|</g;
const ATTR = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(text: string): string {
  if (!text.includes("&")) return text;
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      const valid = code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff);
      return valid ? String.fromCodePoint(code) : entity;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? entity;
  });
}

function parseAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of source.matchAll(ATTR)) {
    const name = match[1].toLowerCase();
    attrs[name] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attrs;
}

/** HTML (vyčištěné sanitizePostHtml) na strom uzlů. */
export function parseHtml(html: string): HtmlNode[] {
  const root: HtmlElement = { type: "element", tag: "#root", attrs: {}, children: [] };
  const stack: HtmlElement[] = [root];

  for (const match of html.matchAll(TOKEN)) {
    const token = match[0];
    const parent = stack[stack.length - 1];
    if (token.startsWith("<!--")) continue;

    const tagName = match[1]?.toLowerCase();
    if (!tagName) {
      parent.children.push({ type: "text", text: token === "<" ? "<" : decodeEntities(token) });
      continue;
    }

    if (token.startsWith("</")) {
      // Neuzavřené značky uvnitř se uzavřou s rodičem, osamělá koncová značka se zahodí.
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tagName) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    const attrSource = match[2] ?? "";
    const element: HtmlElement = {
      type: "element",
      tag: tagName,
      attrs: parseAttrs(attrSource.replace(/\/\s*$/, "")),
      children: [],
    };
    parent.children.push(element);
    if (!VOID_TAGS.has(tagName) && !/\/\s*$/.test(attrSource)) stack.push(element);
  }
  return root.children;
}

/** Text uzlu včetně potomků. */
export function textOf(node: HtmlNode): string {
  return node.type === "text" ? node.text : node.children.map(textOf).join("");
}

const MEDIA_TAGS = new Set(["img", "iframe", "br"]);

function hasMedia(node: HtmlNode): boolean {
  return node.type === "element" && (MEDIA_TAGS.has(node.tag) || node.children.some(hasMedia));
}

/** Id galerie ze značky <p data-gallery="ID"></p>, jinak null. */
export function galleryIdOf(node: HtmlNode): string | null {
  return node.type === "element" && node.tag === "p" && node.attrs["data-gallery"] ? node.attrs["data-gallery"] : null;
}

/** Prázdný blok: mezery mezi značkami nebo prázdný odstavec bez fotky a bez galerie. */
export function isBlank(node: HtmlNode): boolean {
  if (node.type === "text") return !node.text.trim();
  return node.tag === "p" && galleryIdOf(node) === null && !textOf(node).trim() && !hasMedia(node);
}

const normalizeSpace = (text: string) => text.replace(/[\s ]+/g, " ").trim();

// ---------------------------------------------------------------------------
// Perex v textu
// ---------------------------------------------------------------------------

// Uvozovky se při porovnání perexu s textem neliší: perex z modelu má
// „expediční“, text ze starého webu "expediční" (stejně porovnává import).
const QUOTES = /[„“”"]/g;
const comparable = (text: string) => normalizeSpace(text).replace(QUOTES, '"');

/**
 * Perex článku bývá doslova začátek prvního odstavce (u článků ze starého
 * webu vždy, migrace/MIGRACE.md). V záhlaví je velkým serifem, v textu by se
 * hned pod ním opakoval. Model u článku 2025 text začíná až za perexem,
 * proto se tady stejný začátek z textu vynechá. Jen přesná shoda (liší se
 * nejvýš mezery a druh uvozovek): odstavec rovný perexu zmizí celý, odstavec,
 * který perexem začíná, přijde o tenhle začátek. Hledá se v prvním odstavci,
 * před ním smí být jen nadpis (podtitul článku 2017) nebo krátký tučný
 * mezititulek („Proč na Floridu?“ v článku 2010). Pod nadpisem se odstavec
 * celý nevynechá, nadpis by zůstal bez textu.
 */
function stripLeadingPerex(nodes: HtmlNode[], perex: string | null): void {
  const target = perex ? comparable(perex) : "";
  if (!target) return;

  let afterHeading = false;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (isBlank(node)) continue;
    if (node.type !== "element" || !["p", "h2", "h3"].includes(node.tag) || galleryIdOf(node) !== null) return;

    const text = comparable(textOf(node));
    if (text === target) {
      if (!afterHeading) nodes.splice(i, 1);
      return;
    }
    if (node.tag === "p") {
      if (text.startsWith(`${target} `)) {
        removeLeadingText(node, target);
        return;
      }
      if (!isBoldSubheading(node, text)) return;
    }
    // Nadpis nebo tučný mezititulek před prvním odstavcem: perex se hledá v dalším bloku.
    afterHeading = true;
  }
}

/** Mezititulek ze starého webu: krátký odstavec, ve kterém je jen tučný text. */
function isBoldSubheading(element: HtmlElement, text: string): boolean {
  const children = element.children.filter((child) => child.type === "element" || child.text.trim() !== "");
  return text.length <= 80 && children.length === 1 && children[0].type === "element" && children[0].tag === "strong";
}

/** Odebere ze začátku prvku text `target` (mezery a uvozovky se porovnávají volně) a prázdné značky po něm. */
function removeLeadingText(element: HtmlElement, target: string): void {
  let pos = 0;
  const isSpace = (ch: string) => /[\s ]/.test(ch);

  const walk = (parent: HtmlElement): boolean => {
    for (const child of parent.children) {
      if (child.type === "element") {
        if (walk(child)) return true;
        continue;
      }
      const text = child.text;
      let k = 0;
      while (k < text.length && pos < target.length) {
        const ch = text[k];
        if (isSpace(ch)) {
          if (target[pos] === " ") pos++;
          k++;
          continue;
        }
        if (ch.replace(QUOTES, '"') !== target[pos]) return true;
        pos++;
        k++;
      }
      if (pos >= target.length) {
        child.text = text.slice(k).replace(/^[\s ]+/, "");
        return true;
      }
      child.text = "";
    }
    return false;
  };

  walk(element);
  pruneEmpty(element);
}

/** Odstraní prázdné textové uzly a značky, ve kterých po úpravě nic nezůstalo. */
function pruneEmpty(element: HtmlElement): void {
  element.children = element.children.filter((child) => {
    if (child.type === "text") return child.text !== "";
    if (VOID_TAGS.has(child.tag) || child.tag === "iframe") return true;
    pruneEmpty(child);
    return child.children.length > 0;
  });
  // Odstavec nemá začínat zalomením řádku, které patřilo za vynechaný text.
  while (element.children[0]?.type === "element" && element.children[0].tag === "br") element.children.shift();
}

// ---------------------------------------------------------------------------
// Podtitul
// ---------------------------------------------------------------------------

const isHeading = (node: HtmlNode): node is HtmlElement =>
  node.type === "element" && (node.tag === "h2" || node.tag === "h3");

/**
 * Podtitul článku ze starého webu: text začíná nadpisem, za ním hned první
 * odstavec a jiný nadpis stejné úrovně v článku není (článek 2017: h2
 * „Přelet nového letadla…“, kapitoly Den 1-4 v h3). Model ho má v záhlaví
 * jako perex, v textu by se jinak četl jako kapitola bez obsahu a odstavec
 * by rozdělilo záhlaví, fotka a nadpis. Nadpis se z textu vyjme a vrátí se
 * jeho text, jinak null a text zůstane beze změny.
 */
function extractSubtitle(nodes: HtmlNode[]): string | null {
  const blocks = nodes.map((node, index) => ({ node, index })).filter(({ node }) => !isBlank(node));
  const [first, second] = blocks;
  if (!first || !second || !isHeading(first.node)) return null;
  const heading = first.node;
  const next = second.node;
  if (next.type !== "element" || next.tag !== "p" || galleryIdOf(next) !== null || hasMedia(next)) return null;
  if (nodes.some((node) => node !== heading && isHeading(node) && node.tag === heading.tag)) return null;

  const text = textOf(heading).replace(/[ \t\r\n]+/g, " ").trim();
  if (!text) return null;
  nodes.splice(first.index, 1);
  return text;
}

/**
 * Po vyjmutí podtitulu jsou kapitoly článku 2017 jen v h3 (21 px). Model je
 * má jako h2 (28 px) a nadpisy nesmí přeskočit úroveň (h1 stránky, pak h3),
 * proto se h3 vykreslí jako h2, když v textu žádný h2 nezůstal.
 */
function promoteChapterHeadings(nodes: HtmlNode[]): void {
  if (nodes.some((node) => node.type === "element" && node.tag === "h2")) return;
  for (const node of nodes) {
    if (node.type === "element" && node.tag === "h3") node.tag = "h2";
  }
}

// ---------------------------------------------------------------------------
// Nadpisy a obsah článku
// ---------------------------------------------------------------------------

/** Id, která na stránce článku už jsou (layout, sekce stránky). */
const RESERVED_IDS = ["obsah", "obsah-clanku", "mobilni-menu", "fotky", "fotky-nadpis", "dalsi-nadpis", "poptat-nadpis"];

function slugify(text: string): string {
  const slug = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return slug || "kapitola";
}

/**
 * Doplní nadpisům v textu id (kotvy z obsahu) a vrátí obsah článku. Obsah
 * je z nadpisů h2, jako v modelu. Když jsou h2 méně než dva (článek 2017 má
 * jediný h2 jako podtitul a kapitoly Den 1-4 v h3), použijí se h3. Méně než
 * dvě položky = bez obsahu.
 */
function buildToc(nodes: HtmlNode[]): TocEntry[] {
  const used = new Set(RESERVED_IDS);
  const byLevel: Record<"h2" | "h3", HtmlElement[]> = { h2: [], h3: [] };

  for (const node of nodes) {
    if (node.type !== "element" || (node.tag !== "h2" && node.tag !== "h3")) continue;
    const text = normalizeSpace(textOf(node));
    if (!text) continue;
    const base = slugify(text);
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    node.attrs = { ...node.attrs, id };
    byLevel[node.tag].push(node);
  }

  const level = byLevel.h2.length >= 2 ? byLevel.h2 : byLevel.h3.length >= 2 ? byLevel.h3 : [];
  return level.map((node) => ({
    id: node.attrs.id,
    // Pevné mezery z czechNbsp zůstávají, běžné se sjednotí.
    text: textOf(node).replace(/[ \t\r\n]+/g, " ").trim(),
  }));
}

// ---------------------------------------------------------------------------
// Galerie
// ---------------------------------------------------------------------------

/** Galerie s fotkami, které jde ukázat (adresa a rozměry). Id vždy jako text, import může dát číslo. */
function usableGalleries(galleries: PostGallery[]): Map<string, PostGallery> {
  const map = new Map<string, PostGallery>();
  for (const gallery of Array.isArray(galleries) ? galleries : []) {
    const items = (Array.isArray(gallery?.items) ? gallery.items : []).filter(
      (item) => item && typeof item.url === "string" && item.url !== "",
    );
    if (items.length > 0) map.set(String(gallery.id), { id: String(gallery.id), items });
  }
  return map;
}

/**
 * Galerie na konci textu (za nimi už není žádný odstavec) se ukážou ve
 * vlastní sekci pod článkem přes celou šířku, jako „Fotky z přeletu“ v modelu
 * článku 2017. Galerie uprostřed textu zůstávají na svém místě v .prose.
 * Výjimka: galerie hned pod nadpisem patří ke kapitole (Oblet Ameriky má
 * u každého dne nadpis a pod ním galerii), zůstává v textu i na konci.
 */
function splitTrailingGalleries(
  nodes: HtmlNode[],
  galleries: Map<string, PostGallery>,
): { nodes: HtmlNode[]; trailing: PostGallery[] } {
  const trailing: PostGallery[] = [];
  let last = nodes.length - 1;
  for (; last >= 0; last--) {
    const node = nodes[last];
    if (isBlank(node)) continue;
    const id = galleryIdOf(node);
    if (id === null) break;
    const gallery = galleries.get(id);
    if (gallery) trailing.unshift(gallery);
  }
  const before = last >= 0 ? nodes[last] : null;
  if (before?.type === "element" && (before.tag === "h2" || before.tag === "h3")) return { nodes, trailing: [] };
  return { nodes: nodes.slice(0, last + 1), trailing };
}

// ---------------------------------------------------------------------------
// Článek
// ---------------------------------------------------------------------------

/** Text článku připravený k vykreslení: vyčištěný, s pevnými mezerami, s obsahem a galeriemi. */
export function prepareArticleBody(post: Pick<PublicPost, "content" | "perex" | "gallery">): ArticleBody {
  const nodes = parseHtml(czechNbsp(sanitizePostHtml(post.content ?? "")));
  const subtitle = extractSubtitle(nodes);
  // S podtitulem v záhlaví zůstává první odstavec celý (perex je jen jeho
  // první věta a v záhlaví se neukazuje).
  if (subtitle === null) stripLeadingPerex(nodes, post.perex);
  else promoteChapterHeadings(nodes);
  const toc = buildToc(nodes);
  const galleries = usableGalleries(post.gallery);
  const split = splitTrailingGalleries(nodes, galleries);
  return { nodes: split.nodes, trailingGalleries: split.trailing, galleries, toc, subtitle };
}

/** Prostý text začátku článku pro popis stránky, když článek nemá perex. */
export function articleLeadText(html: string): string {
  for (const node of parseHtml(sanitizePostHtml(html ?? ""))) {
    if (node.type === "element" && node.tag === "p") {
      const text = normalizeSpace(textOf(node));
      if (text) return text;
    }
  }
  return "";
}

// ---------------------------------------------------------------------------
// Video
// ---------------------------------------------------------------------------

const YOUTUBE_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtube-nocookie.com",
  "youtube-nocookie.com",
]);

const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/;

/**
 * Id videa a začátek (v sekundách) z adresy na YouTube: youtu.be/ID,
 * watch?v=ID, shorts/ID, live/ID a embed/ID (iframe z editoru článků je
 * youtube-nocookie.com/embed/ID). Jen hosty YouTube, jiný tvar = null.
 */
export function youtubeVideo(link: string): { id: string; start: string | null } | null {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  if (!["https:", "http:"].includes(url.protocol) || !YOUTUBE_HOSTS.has(url.hostname)) return null;

  const parts = url.pathname.split("/").filter(Boolean);
  let id: string | undefined;
  if (url.hostname === "youtu.be") id = parts[0];
  else if (parts[0] === "watch") id = url.searchParams.get("v") ?? undefined;
  else if (["embed", "shorts", "live", "v"].includes(parts[0])) id = parts[1];
  if (!id || !YOUTUBE_ID.test(id)) return null;

  const start = (url.searchParams.get("t") ?? url.searchParams.get("start") ?? "").replace(/s$/, "");
  return { id, start: /^\d{1,6}$/.test(start) ? start : null };
}

/**
 * Odkaz „Video na YouTube“ místo vloženého přehrávače, jako model u článku
 * 2017 (https://youtu.be/ID). Přehrávač by se načítal sám bez kliknutí,
 * poslal by IP návštěvníka Googlu a stáhl asi 1,2 MB. Neznámá adresa = null.
 */
export function youtubeLink(link: string): string | null {
  const video = youtubeVideo(link);
  if (!video) return null;
  return `https://youtu.be/${video.id}${video.start ? `?t=${video.start}` : ""}`;
}
