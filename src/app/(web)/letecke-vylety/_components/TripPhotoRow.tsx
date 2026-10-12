import type { CSSProperties } from "react";
import { Figure, PHOTO_CREDIT } from "@/components/web/Figure";
import { resolvePhoto } from "@/components/web/Photo";
import type { Trip } from "@/data/trips";
import { czechNbspText } from "@/lib/typography";
import { TRIP_MEDIA, type TripPhoto } from "../_data/trip-media";
import { PhotoRow } from "./PhotoRow";

/**
 * sizes fotky v řadě (.vy-row-slide): pod 601 px celá šířka obrazovky,
 * do 960 px asi tři čtvrtiny, na počítači 680 px.
 */
const SLIDE_SIZES = "(max-width: 600px) 100vw, (max-width: 960px) 75vw, 680px";

/** Viditelný popisek fotky: z fotobanky, jinak popisek fotky z photos.ts. */
export function tripPhotoCaption(item: TripPhoto): string {
  const data = resolvePhoto(item.photo);
  return item.caption ?? data.caption ?? data.alt;
}

/**
 * Posuvná řada fotek destinací pod záhlavím výletu (místo jedné velké
 * fotky). Fotky a popisky ze _data/trip-media.ts, první fotka je největší
 * prvek první obrazovky, načítá se hned, ostatní líně. Dovětek „Foto: archiv
 * FLY America“ jednou pod řadou, ne u každé fotky.
 */
export function TripPhotoRow({ trip }: { trip: Trip }) {
  const slides = TRIP_MEDIA[trip.slug].slides;
  const captions = slides.map((item) => czechNbspText(tripPhotoCaption(item)));
  return (
    <PhotoRow label={`Fotky destinací výletu ${trip.name}`} captions={captions} credit={PHOTO_CREDIT}>
      {slides.map((item, index) => (
        <Figure
          key={item.photo}
          photo={item.photo}
          alt={item.alt}
          caption={captions[index]}
          sizes={SLIDE_SIZES}
          priority={index === 0}
          style={item.position ? ({ "--pos": item.position } as CSSProperties) : undefined}
        />
      ))}
    </PhotoRow>
  );
}
