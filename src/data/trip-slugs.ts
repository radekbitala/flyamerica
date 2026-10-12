/**
 * Slugy leteckých výletů: adresa /letecke-vylety/<slug> a hodnota ?vylet=
 * v poptávce. Samostatně, aby menu v prohlížeči (src/components/web/nav.ts)
 * nestahovalo texty výletů ze src/data/trips.ts.
 */
export const TRIP_SLUGS = ["florida-week", "grand-tour"] as const;

export type TripSlug = (typeof TRIP_SLUGS)[number];
