import { Fragment, createElement, type Key, type ReactNode } from "react";
import type { PostGallery } from "@/lib/db/schema";
import {
  galleryIdOf,
  isBlank,
  youtubeLink,
  youtubeVideo,
  type HtmlElement,
  type HtmlNode,
} from "@/lib/post-content";
import { PostGalleryGrid } from "./PostGalleryGrid";
import { PostImage } from "./PostImage";
import { VideoLink } from "./VideoLink";
import { ArticleVideo } from "./ArticleVideo";

/** sizes fotky v šířce sloupce textu (.prose, nejvýš 680 px), jako v modelu. */
const TEXT_PHOTO_SIZES = "(max-width: 600px) calc(100vw - 32px), 680px";
/**
 * sizes široké fotky (.read-wide, src/styles/pages/article.css): do 1199 px
 * celý kontejner, pak 1152 px, s obsahem článku v levém okraji jen sloupec
 * textu a pravý okraj (680 + 236 px).
 */
const WIDE_PHOTO_SIZES = "(max-width: 600px) calc(100vw - 32px), (max-width: 1199px) calc(100vw - 48px), 1152px";
const WIDE_PHOTO_SIZES_TOC = "(max-width: 600px) calc(100vw - 32px), (max-width: 1199px) calc(100vw - 48px), 916px";

/**
 * Fotka na šířku aspoň tak široká jde přes šířku kontejneru. Užší by se
 * zvětšovala nad svou velikost, fotka na výšku by byla vyšší než obrazovka:
 * ty zůstávají v šířce sloupce textu.
 */
const WIDE_MIN_WIDTH = 1000;

/** Značky z allowlistu sanitizePostHtml, které se vykreslí bez atributů. */
const PLAIN_TAGS = new Set(["p", "strong", "em", "ul", "li", "blockquote", "div"]);

/** Značky, ve kterých se mezery mezi bloky nevykreslují (jen konce řádků v HTML). */
const BLOCK_CONTAINERS = new Set(["ul", "ol", "blockquote", "div"]);

/** Značky s obsahem jen na řádku: odkaz na video v nich nesmí být odstavec (<p> v <p>). */
const INLINE_CONTEXT = new Set(["p", "strong", "em", "a", "h2", "h3"]);

/** Značka chybějícího obsahu v textu („[doplnit: závěr článku …]“) jako v modelu. */
const TODO_MARK = /\[doplnit:[^\]]*\]/g;

interface Ctx {
  galleries: Map<string, PostGallery>;
  /** Článek má obsah „V článku“ (od 1200 px v levém okraji, široké fotky jen doprava). */
  hasToc: boolean;
  /** Popis přehrávače videa pro čtečky. */
  videoTitle: string;
}

/**
 * Text článku (strom z prepareArticleBody) jako React. Obsah .prose:
 *
 * - fotka v textu (<img> samostatně nebo jako jediný obsah odstavce) je
 *   <figure class="fig"> přes next/image. Popisek je následující odstavec,
 *   ve kterém je jen <em> (tak ukládá popisky migrace, editor popisky neumí),
 *   v <figcaption> bez kurzívy jako v modelu. Velká fotka na šířku je široká
 *   (.read-wide: širší než text, až na šířku kontejneru), jen přímo v textu,
 *   ne v citaci
 * - značka <p data-gallery="ID"></p> je galerie (mřížka .gallery, v textu
 *   také široká), neznámé id nebo galerie bez fotek se nevykreslí
 * - video z YouTube (<div data-youtube-video><iframe> z editoru) je náhled
 *   s tlačítkem „Přehrát video“, přehrávač youtube-nocookie se načte až po
 *   kliknutí (ArticleVideo, YouTubeVideo). Uvnitř odstavce nebo nadpisu, kde blok být
 *   nesmí, jen odkaz „Video na YouTube“. Iframe, ze kterého nejde vyčíst id
 *   videa, se nevykreslí
 * - nadpisy mají id z obsahu článku, [doplnit: …] je <span class="todo">
 */
export function ArticleContent({
  nodes,
  galleries,
  hasToc,
  videoTitle,
}: {
  nodes: HtmlNode[];
  galleries: Map<string, PostGallery>;
  hasToc: boolean;
  videoTitle: string;
}) {
  return <>{renderBlocks(nodes, { galleries, hasToc, videoTitle }, true)}</>;
}

/** topLevel: bloky přímo v .prose (jen tam smí být fotka nebo galerie široká). */
function renderBlocks(nodes: HtmlNode[], ctx: Ctx, topLevel = false): ReactNode[] {
  const out: ReactNode[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (isBlank(node)) continue;

    const image = blockImage(node);
    if (image) {
      let next = i + 1;
      while (next < nodes.length && nodes[next].type === "text" && isBlank(nodes[next])) next++;
      const caption = next < nodes.length ? captionOf(nodes[next]) : null;
      const wide = topLevel && isWideImage(image);
      out.push(
        <figure className={wide ? "fig read-wide" : "fig"} key={i}>
          {renderImage(image, wide ? (ctx.hasToc ? WIDE_PHOTO_SIZES_TOC : WIDE_PHOTO_SIZES) : TEXT_PHOTO_SIZES)}
          {caption ? <figcaption>{renderChildren(caption, ctx)}</figcaption> : null}
        </figure>,
      );
      if (caption) i = next;
      continue;
    }

    out.push(renderNode(node, ctx, i, false, topLevel));
  }
  return out;
}

function renderChildren(element: HtmlElement, ctx: Ctx): ReactNode[] {
  if (element.tag === "blockquote" || element.tag === "div") return renderBlocks(element.children, ctx);
  const skipSpaces = BLOCK_CONTAINERS.has(element.tag);
  return element.children
    .filter((child) => !(skipSpaces && child.type === "text" && !child.text.trim()))
    .map((child, i) => renderNode(child, ctx, i, INLINE_CONTEXT.has(element.tag)));
}

function renderNode(node: HtmlNode, ctx: Ctx, key: Key, inline = false, topLevel = false): ReactNode {
  if (node.type === "text") return renderText(node.text, key);
  const { tag, attrs } = node;

  switch (tag) {
    case "br":
      return <br key={key} />;
    case "img":
      return <Fragment key={key}>{renderImage(node, TEXT_PHOTO_SIZES)}</Fragment>;
    case "iframe":
      return video(attrs.src, key, inline, ctx);
    case "a":
      return (
        <a key={key} href={attrs.href} target={attrs.target} rel={attrs.rel}>
          {renderChildren(node, ctx)}
        </a>
      );
    case "ol":
      return (
        <ol key={key} start={attrs.start && /^\d+$/.test(attrs.start) ? Number(attrs.start) : undefined}>
          {renderChildren(node, ctx)}
        </ol>
      );
    case "h2":
    case "h3":
      return createElement(tag, { key, id: attrs.id }, ...renderChildren(node, ctx));
    case "p": {
      const galleryId = galleryIdOf(node);
      if (galleryId === null) break;
      const gallery = ctx.galleries.get(galleryId);
      return gallery ? <PostGalleryGrid key={key} gallery={gallery} inProse wide={topLevel} /> : null;
    }
    case "div":
      if ("data-youtube-video" in attrs) return video(findTag(node, "iframe")?.attrs.src, key, inline, ctx);
      break;
  }

  if (PLAIN_TAGS.has(tag)) return createElement(tag, { key }, ...renderChildren(node, ctx));
  // Jiné značky sanitizePostHtml nepustí, kdyby přece: jen jejich obsah.
  return <Fragment key={key}>{renderChildren(node, ctx)}</Fragment>;
}

function video(src: string | undefined, key: Key, inline: boolean, ctx: Ctx): ReactNode {
  const found = src ? youtubeVideo(src) : null;
  const href = src ? youtubeLink(src) : null;
  if (!found || !href) return null;
  if (inline) return <VideoLink key={key} href={href} inline />;
  return <ArticleVideo key={key} id={found.id} start={found.start} href={href} title={ctx.videoTitle} />;
}

function renderText(text: string, key: Key): ReactNode {
  if (!text.includes("[doplnit:")) return text;
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(TODO_MARK)) {
    const start = match.index ?? 0;
    if (start > last) parts.push(text.slice(last, start));
    parts.push(
      <span className="todo" key={start}>
        {match[0]}
      </span>,
    );
    last = start + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <Fragment key={key}>{parts}</Fragment>;
}

/** Rozměr z atributu: kladné celé číslo, jinak null. */
function size(value?: string): number | null {
  return value && /^\d+$/.test(value) && Number(value) > 0 ? Number(value) : null;
}

function renderImage(image: HtmlElement, sizes: string): ReactNode {
  const { src, alt, width, height } = image.attrs;
  if (!src) return null;
  return <PostImage src={src} width={size(width)} height={size(height)} alt={alt ?? ""} sizes={sizes} />;
}

/** Široká fotka: známé rozměry, na šířku a aspoň WIDE_MIN_WIDTH px. */
function isWideImage(image: HtmlElement): boolean {
  const width = size(image.attrs.width);
  const height = size(image.attrs.height);
  return width !== null && height !== null && width > height && width >= WIDE_MIN_WIDTH;
}

/** Potomci bez mezer mezi značkami. */
function meaningful(element: HtmlElement): HtmlNode[] {
  return element.children.filter((child) => child.type === "element" || child.text.trim() !== "");
}

/** Fotka jako samostatný blok: <img>, nebo odstavec, ve kterém je jen <img>. */
function blockImage(node: HtmlNode): HtmlElement | null {
  if (node.type !== "element") return null;
  if (node.tag === "img") return node;
  if (node.tag !== "p" || galleryIdOf(node) !== null) return null;
  const children = meaningful(node);
  const only = children.length === 1 ? children[0] : null;
  return only?.type === "element" && only.tag === "img" ? only : null;
}

/** Popisek fotky: odstavec, ve kterém je jen <em>. Vrací <em>. */
function captionOf(node: HtmlNode): HtmlElement | null {
  if (node.type !== "element" || node.tag !== "p" || galleryIdOf(node) !== null) return null;
  const children = meaningful(node);
  const only = children.length === 1 ? children[0] : null;
  return only?.type === "element" && only.tag === "em" && textOrMedia(only) ? only : null;
}

function textOrMedia(element: HtmlElement): boolean {
  return element.children.some((child) => (child.type === "text" ? child.text.trim() !== "" : true));
}

function findTag(element: HtmlElement, tag: string): HtmlElement | null {
  for (const child of element.children) {
    if (child.type !== "element") continue;
    if (child.tag === tag) return child;
    const found = findTag(child, tag);
    if (found) return found;
  }
  return null;
}
