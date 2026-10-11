import { Fragment, createElement, type Key, type ReactNode } from "react";
import type { PostGallery } from "@/lib/db/schema";
import { galleryIdOf, isBlank, youtubeLink, type HtmlElement, type HtmlNode } from "@/lib/post-content";
import { PostGalleryGrid } from "./PostGalleryGrid";
import { PostImage } from "./PostImage";
import { VideoLink } from "./VideoLink";

/** sizes fotky v textu článku (.prose, nejvýš 680 px), jako v modelu. */
const TEXT_PHOTO_SIZES = "(max-width: 600px) calc(100vw - 32px), 680px";

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
}

/**
 * Text článku (strom z prepareArticleBody) jako React. Obsah .prose:
 *
 * - fotka v textu (<img> samostatně nebo jako jediný obsah odstavce) je
 *   <figure class="fig"> přes next/image. Popisek je následující odstavec,
 *   ve kterém je jen <em> (tak ukládá popisky migrace, editor popisky neumí),
 *   v <figcaption> bez kurzívy jako v modelu
 * - značka <p data-gallery="ID"></p> je galerie (mřížka .gallery), neznámé
 *   id nebo galerie bez fotek se nevykreslí
 * - video z YouTube (<div data-youtube-video><iframe> z editoru) je odkaz
 *   „Video na YouTube“ jako v modelu, přehrávač se nevkládá. Iframe, ze
 *   kterého nejde vyčíst id videa, se nevykreslí
 * - nadpisy mají id z obsahu článku, [doplnit: …] je <span class="todo">
 */
export function ArticleContent({ nodes, galleries }: { nodes: HtmlNode[]; galleries: Map<string, PostGallery> }) {
  return <>{renderBlocks(nodes, { galleries })}</>;
}

function renderBlocks(nodes: HtmlNode[], ctx: Ctx): ReactNode[] {
  const out: ReactNode[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (isBlank(node)) continue;

    const image = blockImage(node);
    if (image) {
      let next = i + 1;
      while (next < nodes.length && nodes[next].type === "text" && isBlank(nodes[next])) next++;
      const caption = next < nodes.length ? captionOf(nodes[next]) : null;
      out.push(
        <figure className="fig" key={i}>
          {renderImage(image)}
          {caption ? <figcaption>{renderChildren(caption, ctx)}</figcaption> : null}
        </figure>,
      );
      if (caption) i = next;
      continue;
    }

    out.push(renderNode(node, ctx, i));
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

function renderNode(node: HtmlNode, ctx: Ctx, key: Key, inline = false): ReactNode {
  if (node.type === "text") return renderText(node.text, key);
  const { tag, attrs } = node;

  switch (tag) {
    case "br":
      return <br key={key} />;
    case "img":
      return <Fragment key={key}>{renderImage(node)}</Fragment>;
    case "iframe":
      return videoLink(attrs.src, key, inline);
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
      return gallery ? <PostGalleryGrid key={key} gallery={gallery} inProse /> : null;
    }
    case "div":
      if ("data-youtube-video" in attrs) return videoLink(findTag(node, "iframe")?.attrs.src, key, inline);
      break;
  }

  if (PLAIN_TAGS.has(tag)) return createElement(tag, { key }, ...renderChildren(node, ctx));
  // Jiné značky sanitizePostHtml nepustí, kdyby přece: jen jejich obsah.
  return <Fragment key={key}>{renderChildren(node, ctx)}</Fragment>;
}

function videoLink(src: string | undefined, key: Key, inline: boolean): ReactNode {
  const href = src ? youtubeLink(src) : null;
  return href ? <VideoLink key={key} href={href} inline={inline} /> : null;
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

function renderImage(image: HtmlElement): ReactNode {
  const { src, alt, width, height } = image.attrs;
  if (!src) return null;
  const size = (value?: string) => (value && /^\d+$/.test(value) && Number(value) > 0 ? Number(value) : null);
  return <PostImage src={src} width={size(width)} height={size(height)} alt={alt ?? ""} sizes={TEXT_PHOTO_SIZES} />;
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
