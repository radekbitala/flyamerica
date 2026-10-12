/**
 * Video z YouTube jako odkaz „Video na YouTube“ (.link-solo), přesně jako
 * model u článku 2017. Přehrávač se do stránky nevkládá: načítal by se sám
 * bez kliknutí, Google by dostal IP návštěvníka (zásady YouTube nezmiňují)
 * a stránka by stáhla asi 1,2 MB navíc. Adresu skládá youtubeLink().
 * inline: video uvnitř odstavce nebo nadpisu, jen odkaz bez vlastního <p>.
 */
export function VideoLink({ href, inline = false }: { href: string; inline?: boolean }) {
  const link = (
    <a className="link-solo" href={href}>
      Video na YouTube
    </a>
  );
  return inline ? link : <p>{link}</p>;
}
