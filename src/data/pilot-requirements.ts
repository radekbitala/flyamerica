/**
 * Požadavky na piloty doslova od Honzy (13. 10. 2026,
 * ../podklady-od-Honzy/2026-10-13_pozadavky-na-piloty-a-sidlo.md), ve třetím
 * odstavci s opraveným pravopisem („zájemce“, „angličtina“, rozhodnutí Radka
 * 14. 10. 2026). Tři odstavce s běžnými mezerami: pevné mezery doplní při
 * vykreslení czechNbspText() (src/lib/typography.ts). Jediný zdroj textu pro
 * úvod, oba výlety (komponenta PilotRequirements) i nápovědu na Kontaktu.
 */
export const PILOT_REQUIREMENTS = [
  "Pro piloty, kteří směřují k procesu validace a případně samostatnému létání v USA, například pro vlastní pronájem letadla pro rekreační létání nebo time-building, je nutná úroveň anglického jazyka ICAO 4 a vyšší.",
  "Platný pilotní průkaz, zápisník letů, platný pas a ESTA nebo turistické vízum, vlastní sluchátka pro Vás i Váš doprovod (aviation jack, 2 kolík).",
  "Pro ostatní ať už piloty UL nebo zájemce bez licence, kteří uvažují létání v USA jako obecnou zkušenost nebo zážitek je vhodná pokročilá neformální a odborná angličtina.",
] as const;

/**
 * Třetí odstavec (piloti UL a zájemci bez licence). Na Kontaktu nápověda
 * pod volbou licence po výběru Ultralight nebo Nemám.
 */
export const PILOT_REQUIREMENTS_NO_LICENCE = PILOT_REQUIREMENTS[2];
