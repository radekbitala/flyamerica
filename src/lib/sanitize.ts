import "server-only";
import sanitizeHtml from "sanitize-html";

const YOUTUBE_HOSTS = [
  "www.youtube.com",
  "youtube.com",
  "www.youtube-nocookie.com",
  "youtube-nocookie.com",
];

const GALLERY_ID = /^[a-z0-9-]+$/;

// Při next dev smí obrázek v textu i přes http, ale jen z lokálního serveru
// s fotkami z migrace (import deníku --local, README). Jinak jen https.
const DEV_HTTP_IMAGES = process.env.NODE_ENV === "development" ? "http://127.0.0.1:8816/" : null;

// Rozměry obrázků a videí a začátek číslovaného seznamu: jen celé číslo.
const DIMENSION = /^\d{1,4}$/;

function keepDimensions(attribs: sanitizeHtml.Attributes): sanitizeHtml.Attributes {
  const result = { ...attribs };
  for (const key of ["width", "height"]) {
    if (result[key] !== undefined && !DIMENSION.test(result[key])) delete result[key];
  }
  return result;
}

/**
 * Allowlist přesně podle editoru článků (Tiptap: StarterKit s nadpisy 2 a 3,
 * Link, Image, Youtube) plus značka galerie <p data-gallery="ID"></p>.
 * Co editor nevytvoří (styly, třídy, skripty, formuláře, jiné iframy), se
 * zahodí. Text z nepovolených značek zůstane, jen bez formátování.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "h2",
    "h3",
    "strong",
    "em",
    "a",
    "ul",
    "ol",
    "li",
    "blockquote",
    "img",
    // Youtube rozšíření balí iframe do <div data-youtube-video>. Bez obalu
    // by video po znovuotevření článku editor nepoznal.
    "div",
    "iframe",
  ],
  allowedAttributes: {
    p: ["data-gallery"],
    a: [
      "href",
      { name: "target", multiple: false, values: ["_blank"] },
      { name: "rel", multiple: true, values: ["noopener", "noreferrer", "nofollow"] },
    ],
    ol: ["start"],
    img: ["src", "alt", "width", "height"],
    div: ["data-youtube-video"],
    iframe: ["src", "width", "height", "allowfullscreen"],
  },
  // Relativní odkazy (/denik, #kotva) projdou, schémata jen tato.
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: {
    // http by prohlížeč na https webu zablokoval.
    img: DEV_HTTP_IMAGES ? ["https", "http"] : ["https"],
    iframe: ["https"],
  },
  allowProtocolRelative: false,
  allowedIframeHostnames: YOUTUBE_HOSTS,
  allowIframeRelativeUrls: false,
  transformTags: {
    // Vložený text z Wordu nebo webu: nadpisy srovnat na úrovně editoru.
    h1: "h2",
    h4: "h3",
    h5: "h3",
    h6: "h3",
    b: "strong",
    i: "em",
    p: (tagName, attribs) => {
      const id = attribs["data-gallery"];
      const kept: sanitizeHtml.Attributes = {};
      if (id !== undefined && GALLERY_ID.test(id)) kept["data-gallery"] = id;
      return { tagName, attribs: kept };
    },
    a: (tagName, attribs) => {
      const { target, ...rest } = attribs;
      // Odkaz do nového okna vždy bez přístupu k původní stránce.
      if (target === "_blank") {
        return { tagName, attribs: { ...rest, target, rel: "noopener noreferrer" } };
      }
      return { tagName, attribs: rest };
    },
    ol: (tagName, attribs) => {
      const kept: sanitizeHtml.Attributes = {};
      if (attribs.start && DIMENSION.test(attribs.start)) kept.start = attribs.start;
      return { tagName, attribs: kept };
    },
    img: (tagName, attribs) => {
      const kept = keepDimensions(attribs);
      // Bez mezer a řídicích znaků, stejně jako je při kontrole schématu bere sanitize-html.
      const src = (kept.src ?? "").replace(/[\u0000-\u0020]+/g, "").toLowerCase();
      if (src.startsWith("http:") && !(DEV_HTTP_IMAGES && src.startsWith(DEV_HTTP_IMAGES))) delete kept.src;
      return { tagName, attribs: kept };
    },
    iframe: (tagName, attribs) => ({ tagName, attribs: keepDimensions(attribs) }),
  },
  // Iframe, kterému sanitizer vzal src (cizí web), obrázek bez src a obal
  // videa bez videa nemají smysl. Prázdný odstavec se značkou galerie naopak
  // zůstat musí.
  exclusiveFilter: (frame) =>
    ((frame.tag === "iframe" || frame.tag === "img") && !frame.attribs.src) ||
    (frame.tag === "div" && frame.mediaChildren.length === 0 && !frame.text.trim()),
};

/** Vyčistí HTML článku z editoru před uložením do databáze. */
export function sanitizePostHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
