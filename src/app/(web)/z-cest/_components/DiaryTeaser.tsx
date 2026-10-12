import Link from "next/link";
import type { ReactNode } from "react";
import { Arrow } from "@/components/web/ArrowSymbol";
import { isoDate, yearOf } from "@/lib/dates";
import { postDisplayTitle } from "@/lib/post-title";
import type { PublicPostSummary } from "@/lib/public-posts";
import { postPath } from "@/lib/routes";
import { czechNbspText } from "@/lib/typography";
import { PostImage } from "./PostImage";

/** sizes fotky v bloku .diary (model: (max-width: 960px) 100vw, 600px). */
const DIARY_PHOTO_SIZES = "(max-width: 960px) 100vw, 600px";

/**
 * Jeden článek ve velkém bloku .diary.dn-lead (fotka 4 : 3 s popiskem,
 * štítek a rok, nadpis, perex v serifu, odkaz). Nejnovější článek na /z-cest
 * a „Z cest“ na konci článku, podle modelu. Rok místo celého data jako
 * v modelu, celé datum mají karty a záhlaví článku. Bez fotky jen text.
 *
 * Celý blok je odkaz na článek jako karty starších článků: odkazem je nadpis
 * (.teaser-link, jméno odkazu je titulek) a jeho plocha pokrývá celý blok
 * (src/styles/pages/article.css). „Číst článek“ je jen viditelná značka,
 * čtečka ho nečte podruhé. Odkazy v children (novější článek, všechny
 * články) zůstávají samostatně klikací nad plochou bloku.
 */
export function DiaryTeaser({
  post,
  label,
  headingId,
  linkText,
  priority = false,
  children,
}: {
  post: PublicPostSummary;
  label: ReactNode;
  headingId: string;
  linkText: string;
  /** Fotka v prvním záběru stránky (nejnovější článek na /z-cest). */
  priority?: boolean;
  /** Pod odkazem, např. .diary-older s dalšími články. */
  children?: ReactNode;
}) {
  const image = post.image;
  return (
    <div className="fa-wrap">
      <div className="diary dn-lead teaser">
        {image ? (
          <figure className="fig fig--43">
            <PostImage
              src={image.url}
              width={image.width}
              height={image.height}
              alt={image.alt}
              sizes={DIARY_PHOTO_SIZES}
              priority={priority}
              blurDataURL={image.blur}
            />
            {image.alt.trim() ? <figcaption>{czechNbspText(image.alt.trim())}</figcaption> : null}
          </figure>
        ) : null}
        <div>
          <div className="meta">
            <span className="lbl">{label}</span>
            <time className="date" dateTime={isoDate(post.publishedAt)}>
              {yearOf(post.publishedAt)}
            </time>
          </div>
          <h2 id={headingId}>
            <Link className="teaser-link" href={postPath(post.slug)}>
              {czechNbspText(postDisplayTitle(post.title))}
            </Link>
          </h2>
          {post.perex ? <p className="voice">{czechNbspText(post.perex)}</p> : null}
          <span className="fa-link" aria-hidden="true">
            {linkText} <Arrow />
          </span>
          {children}
        </div>
      </div>
    </div>
  );
}
