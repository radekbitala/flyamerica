import { youtubeThumbnail } from "@/lib/youtube-thumbnail";
import { YouTubeVideo, type YouTubeVideoProps } from "./YouTubeVideo";

/**
 * Video v článku (blok v textu i pole „Video z YouTube“): na serveru vybere
 * největší náhled, který video má (youtubeThumbnail), a předá ho klientské
 * komponentě YouTubeVideo (náhled s tlačítkem, přehrávač až po kliknutí).
 */
export async function ArticleVideo(props: Omit<YouTubeVideoProps, "thumbnail">) {
  const thumbnail = await youtubeThumbnail(props.id);
  return <YouTubeVideo {...props} thumbnail={thumbnail} />;
}
