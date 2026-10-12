/**
 * Video z YouTube jen jako odkaz „Video na YouTube“ (.link-solo, model
 * u článku 2017). Jen tam, kde náhled s přehrávačem (YouTubeVideo) být
 * nesmí: iframe uvnitř odstavce nebo nadpisu, blok by v nich byl neplatné
 * HTML. Adresu skládá youtubeLink().
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
