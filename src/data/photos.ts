/**
 * Fotky stránek webu: fotky z klikacího modelu (prototyp/img, přehled
 * img/_seznam.tsv) a fotky z fotobanky (../fotobanka) po oblastech webu.
 * V public/img je od každé fotky jen největší potřebná varianta, menší
 * velikosti a formáty (AVIF, WebP) dělá next/image.
 *
 * Fotky z modelu (MODEL_PHOTOS níž): klíč = název souboru v modelu bez
 * přípony a bez velikosti (img/cedar-key-letecky-800.jpg ->
 * "cedar-key-letecky"). alt je popisek z archivu doslova (s opraveným
 * pravopisem), stejný jako v modelu. Viditelný popisek pod fotkou je stejný
 * text, pevné mezery v něm doplní czechNbspText() (komponenta Figure to dělá
 * sama). Kódy letišť z popisků nedávat na stránky s jiným Honzovým kódem
 * (_PRAVIDLA.md, část 3). Vygenerováno z prototyp/img/_seznam.tsv 11. 10. 2026.
 *
 * Fotky z fotobanky jsou v samostatných souborech podle oblasti webu, aby
 * do nich mohlo psát víc lidí najednou bez konfliktů:
 * photos-home.ts (úvod), photos-trips.ts (letecké výlety),
 * photos-destinations.ts (Kam letět), photos-article.ts (články Z cest).
 * Postup přidání fotky je v README (Veřejný web, Fotky). Stejný klíč ve
 * dvou souborech je chyba (mergePhotoSets() ji ohlásí při buildu).
 */

import { articlePhotos } from "./photos-article";
import { destinationPhotos } from "./photos-destinations";
import { homePhotos } from "./photos-home";
import { tripPhotos } from "./photos-trips";

export interface Photo {
  /** Adresa v public/, pro next/image. */
  src: string;
  /** Skutečné rozměry souboru v public/img. */
  width: number;
  height: number;
  /** Popisek z archivu, bez pevných mezer (atributy je nemají). */
  alt: string;
  /**
   * Viditelný popisek, když se liší od alt (fotobanka má „popisek“ i „alt“).
   * Bez něj je popiskem alt. Bez pevných mezer, doplní je Figure.
   */
  caption?: string;
}

const MODEL_PHOTOS = {
  // úvod; v modelu: index
  "uvod-jezera-lake-wales": { src: "/img/uvod-jezera-lake-wales.jpg", width: 3110, height: 2333, alt: "Jezera u Lake Wales před západem slunce tvoří krásně barevné scenérie." },
  // letadlo; v modelu: balicek-florida-week, balicek-grand-tour, index
  "cessna-182-winter-haven": { src: "/img/cessna-182-winter-haven.jpg", width: 1600, height: 1200, alt: "Naše expediční Cessna 182 na letišti ve Winter Haven (KGIF)" },
  // letadlo; v modelu: balicek-florida-week, balicek-grand-tour, index
  "cessna-182-marco-island": { src: "/img/cessna-182-marco-island.jpg", width: 1600, height: 1200, alt: "Naše Cessna na letišti Marco Island v blízkosti Everglades" },
  // FA83; v modelu: balicek-florida-week, balicek-grand-tour, tipy-na-vylety
  "fa83-orlando-north-letecky": { src: "/img/fa83-orlando-north-letecky.jpg", width: 1600, height: 1200, alt: "Naše domovské letiště Orlando North (FA83)" },
  // FA83; v modelu: tipy-na-vylety
  "fa83-pripravy-pred-odletem": { src: "/img/fa83-pripravy-pred-odletem.jpg", width: 1600, height: 900, alt: "Přípravy před odletem. Letiště Orlando North Park (FA83)" },
  // KCDK; v modelu: index, tipy-na-vylety
  "cedar-key-letecky": { src: "/img/cedar-key-letecky.jpg", width: 1600, height: 1067, alt: "Letiště Lewis (CDK), Cedar Key, Florida" },
  // KCDK; v modelu: balicek-florida-week, tipy-na-vylety
  "cedar-key-cessna-170": { src: "/img/cedar-key-cessna-170.jpg", width: 1600, height: 1200, alt: "Přistávající Cessna 170 na letišti Lewis, Cedar Key (KCDK)" },
  // KCDK; v modelu: balicek-florida-week, tipy-na-vylety
  "cedar-key-okoli": { src: "/img/cedar-key-okoli.jpg", width: 1600, height: 1200, alt: "Okolí Cedar Key, kde se nachází letiště Lewis (KCDK). Toto místo v Mexickém zálivu působí velmi exoticky." },
  // KSPG; v modelu: balicek-florida-week, index, tipy-na-vylety
  "albert-whitted-letecky": { src: "/img/albert-whitted-letecky.jpg", width: 2400, height: 1800, alt: "Malebné letiště u Tampy a St. Petersburgu se jmenuje Albert Whitted Field (KSPG)" },
  // KSPG; v modelu: tipy-na-vylety
  "albert-whitted-budova": { src: "/img/albert-whitted-budova.jpg", width: 1600, height: 1200, alt: "Albert Whitted" },
  // KSPG; v modelu: tipy-na-vylety
  "albert-whitted-vyhled-z-restaurace": { src: "/img/albert-whitted-vyhled-z-restaurace.jpg", width: 1600, height: 1200, alt: "Výhled z letištní restaurace v Saint Petersburgu, Albert Whitted (KSPG)" },
  // KVRB; v modelu: tipy-na-vylety
  "vero-beach-stojanka": { src: "/img/vero-beach-stojanka.jpg", width: 1600, height: 1200, alt: "Vero Beach" },
  // KVRB; v modelu: tipy-na-vylety
  "vero-beach-po-bource": { src: "/img/vero-beach-po-bource.jpg", width: 1600, height: 1200, alt: "Letiště Vero Beach (KVRB) po jedné z bouřek, které v tu chvíli zalévaly intenzivně celou Floridu." },
  // KVRB; v modelu: tipy-na-vylety
  "vero-beach-nase-letadlo": { src: "/img/vero-beach-nase-letadlo.jpg", width: 580, height: 435, alt: "Naše letadlo na letišti ve Vero Beach (KVRB)" },
  // Palatka; v modelu: tipy-na-vylety
  "palatka-tankovani": { src: "/img/palatka-tankovani.jpg", width: 1600, height: 1200, alt: "První velké tankování před zahájením přeletu do Evropy. Letiště Palatka Larkin (K28J)." },
  // KISM; v modelu: tipy-na-vylety
  "kissimmee-falcon": { src: "/img/kissimmee-falcon.jpg", width: 580, height: 435, alt: "Falcon krátce po přistání na letišti Kissimmee (KISM)" },
  // KCOI; v modelu: index, tipy-na-vylety
  "merritt-island-pristani": { src: "/img/merritt-island-pristani.jpg", width: 1600, height: 1067, alt: "Přistání na Merritt Island (MCOI), Florida" },
  // KCOI; v modelu: tipy-na-vylety
  "merritt-island-space-coast": { src: "/img/merritt-island-space-coast.jpg", width: 1600, height: 1067, alt: "Space Coast museum" },
  // KCOI; v modelu: tipy-na-vylety
  "merritt-island-fbo": { src: "/img/merritt-island-fbo.jpg", width: 580, height: 435, alt: "Space Coast Aviation je FBO působící na letišti Merritt Island (KCOI)" },
  // Key West a Everglades; v modelu: balicek-grand-tour, index, tipy-na-vylety
  "key-west-plaz": { src: "/img/key-west-plaz.jpg", width: 1600, height: 1200, alt: "Floridský Key West je jedno z mála míst v USA s celoročně subtropickým až tropickým klimatem." },
  // Key West a Everglades; v modelu: balicek-grand-tour
  "everglades-airpark": { src: "/img/everglades-airpark.jpg", width: 1600, height: 1200, alt: "Everglades" },
  // Honza; v modelu: denik, denik-dalsi-prelet-oceanu-2025, o-honzovi
  "honza-vision-jet": { src: "/img/honza-vision-jet.jpg", width: 1600, height: 1200, alt: "Po prvním letu na Cirrus Vision Jet, Knoxville, Tennessee, USA" },
  // Honza; v modelu: o-honzovi
  "honza-robinson": { src: "/img/honza-robinson.jpg", width: 1600, height: 1200, alt: "U výrobce Robinson Helicopter, Torrance, California, USA" },
  // Honza; v modelu: denik-druhy-prelet-atlantiku-2017, o-honzovi
  "honza-gronsko": { src: "/img/honza-gronsko.jpg", width: 1600, height: 1200, alt: "Přistání v Grónsku, Sondre Stromfjord" },
  // Honza; v modelu: kontakt, o-honzovi
  "honza-mustang-kalmar": { src: "/img/honza-mustang-kalmar.jpg", width: 1600, height: 1200, alt: "S Cessnou Mustang na švédském letišti Kalmar ESMQ" },
  // Honza; v modelu: o-honzovi
  "honza-r44": { src: "/img/honza-r44.jpg", width: 1600, height: 1200, alt: "Ve vrtulníku R-44 na Dymníku u Rumburka" },
  // Honza; v modelu: index, o-honzovi
  "honza-mustang-goteborg": { src: "/img/honza-mustang-goteborg.jpg", width: 1200, height: 1600, alt: "V Cessně Mustang v Göteborgu, Švédsko" },
  // Key West a Everglades; v modelu: balicek-grand-tour, tipy-na-vylety
  "everglades-letecky": { src: "/img/everglades-letecky.jpg", width: 2400, height: 1800, alt: "Everglades" },
  // Honza; v modelu: o-honzovi
  "honza-lake-powell": { src: "/img/honza-lake-powell.jpg", width: 1024, height: 768, alt: "Nad jezerem Lake Powell, Utah/Arizona, USA" },
  // Key West a Everglades; v modelu: tipy-na-vylety
  "tipy-florida-keys-silnice": { src: "/img/tipy-florida-keys-silnice.jpg", width: 1600, height: 1200, alt: "Dobře známá silnice spojující Miami s nejjižnějším cípem kontinentálních USA, tedy Key West." },
  // deník 2010; v modelu: denik
  "denik-2010-jfk": { src: "/img/denik-2010-jfk.jpg", width: 580, height: 435, alt: "Naše letadlo Boeing 767 společnosti Delta na letišti JFK v New Yorku" },
  // deník 2016; v modelu: denik
  "denik-2016-death-valley": { src: "/img/denik-2016-death-valley.jpg", width: 1600, height: 1067, alt: "Death Valley Furnace" },
  // deník 2016; v modelu: denik
  "denik-2016-houston": { src: "/img/denik-2016-houston.jpg", width: 1600, height: 1200, alt: "Houston Southwest (KAHX)" },
  // deník 2017; v modelu: denik
  "denik-2017-aircare": { src: "/img/denik-2017-aircare.jpg", width: 1600, height: 1200, alt: "AirCare" },
  // deník 2017; v modelu: denik
  "denik-2017-stuart-mustang": { src: "/img/denik-2017-stuart-mustang.jpg", width: 1600, height: 1200, alt: "Prohlídka Cessny Mustang na letišti Stuart KSUA" },
  // deník 2017; v modelu: denik
  "denik-2017-cirrus-g6": { src: "/img/denik-2017-cirrus-g6.jpg", width: 1600, height: 1200, alt: "Rozlétání na typu SR-22, Generace 6, předtím než mi společnost Cirrus Aircraft letadlo zapůjčila." },
  // deník 2018; v modelu: denik
  "denik-2018-lakeland": { src: "/img/denik-2018-lakeland.jpg", width: 1600, height: 1200, alt: "Letadlo lovců hurikánů se chystá ke vzletu k hurikánu Michael na letišti Lakeland (KLAL)" },
  // deník 2019; v modelu: denik
  "denik-2019-albert-whitted-r44": { src: "/img/denik-2019-albert-whitted-r44.jpg", width: 1600, height: 1200, alt: "Na letišti Albert Whitted, Saint Petersburg" },
  // deník 2022; v modelu: denik
  "denik-2022-tennessee": { src: "/img/denik-2022-tennessee.jpg", width: 1600, height: 1200, alt: "Barvy podzimu nad Tennessee" },
  // deník 2023; v modelu: denik
  "denik-2023-orlando": { src: "/img/denik-2023-orlando.jpg", width: 1600, height: 1200, alt: "Jedno z předměstí Orlanda" },
  // deník 2017 přelet; v modelu: denik-dalsi-prelet-oceanu-2025, denik-druhy-prelet-atlantiku-2017
  "denik-2017-ledove-kry": { src: "/img/denik-2017-ledove-kry.jpg", width: 1600, height: 1200, alt: "Ledové kry v jednom z grónských fjordů" },
  // deník 2017 přelet; v modelu: denik-druhy-prelet-atlantiku-2017
  "denik-2017-knoxville": { src: "/img/denik-2017-knoxville.jpg", width: 1600, height: 1200, alt: "Letiště Knoxville, McGhee Tyson (KTYS). První fotka před odletem na první úsek trati z Knoxville do Erie (Pennsylvania), který trval přibližně 2,5 hodiny." },
  // deník 2017 přelet; v modelu: denik-druhy-prelet-atlantiku-2017
  "denik-2017-la-grande": { src: "/img/denik-2017-la-grande.jpg", width: 1600, height: 1200, alt: "První mezipřistání v „divočině“ bylo na letišti La Grande Riviere (CYGL)" },
  // deník 2017 přelet; v modelu: denik-druhy-prelet-atlantiku-2017, index
  "denik-2017-ice-cap": { src: "/img/denik-2017-ice-cap.jpg", width: 1600, height: 1200, alt: "Grónsko má největší ledovec na severní polokouli. Sahá do výšky přes 2100 metrů a říká se mu ledová čepice, Ice cap." },
  // deník 2017 přelet; v modelu: denik-druhy-prelet-atlantiku-2017
  "denik-2017-wick-pobrezi": { src: "/img/denik-2017-wick-pobrezi.jpg", width: 1600, height: 1200, alt: "Nejsevernější část Skotska s letištěm Wick (EGPC). Tolik vytoužený pohled po nekonečných 4 hodinách letu z islandského Keflaviku." },
  // deník 2017 přelet; v modelu: denik-druhy-prelet-atlantiku-2017
  "denik-2017-knoxville-stojanka": { src: "/img/denik-2017-knoxville-stojanka.jpg", width: 1600, height: 1200, alt: "Letiště Knoxville, McGhee Tyson (KTYS). Je to velmi aktivní vnitrostátní letiště s korporátním i velmi čilým linkovým provozem." },
  // deník 2017 přelet; v modelu: denik-druhy-prelet-atlantiku-2017
  "denik-2017-erie": { src: "/img/denik-2017-erie.jpg", width: 1600, height: 1200, alt: "První zastávka pro palivo a celní odbavení. Letiště Erie (KERI) u stejnojmenného jezera v systému Velkých amerických jezer (The Great Lakes)" },
  // deník 2017 přelet; v modelu: denik, denik-druhy-prelet-atlantiku-2017
  "denik-2017-oshawa-falcony": { src: "/img/denik-2017-oshawa-falcony.jpg", width: 1600, height: 1200, alt: "Neobvyklé množství starších Falconů na kanadském letišti Oshawa (CYOO)" },
  // deník 2017 přelet; v modelu: denik-druhy-prelet-atlantiku-2017
  "denik-2017-oshawa-an2": { src: "/img/denik-2017-oshawa-an2.jpg", width: 1600, height: 1200, alt: "Antonov AN-2 byl pro mě velkým překvapením. Nicméně v Kanadě jich létá poměrně hodně." },
  // deník 2017 přelet; v modelu: denik-druhy-prelet-atlantiku-2017
  "denik-2017-la-grande-hs748": { src: "/img/denik-2017-la-grande-hs748.jpg", width: 1600, height: 1200, alt: "Hawker Siddeley HS-748 na letišti La Grande Riviere (CYGL)" },
  // deník 2017 přelet; v modelu: denik-druhy-prelet-atlantiku-2017
  "denik-2017-po-vzletu-la-grande": { src: "/img/denik-2017-po-vzletu-la-grande.jpg", width: 1600, height: 1200, alt: "Po vzletu z letiště La Grande Riviere (CYGL), Quebec, Kanada" },
  // deník 2017 přelet; v modelu: denik-druhy-prelet-atlantiku-2017
  "denik-2017-iqaluit": { src: "/img/denik-2017-iqaluit.jpg", width: 1600, height: 1200, alt: "Letiště Iqaluit (CYFB), dříve Frobisher Bay." },
  // deník 2017 přelet; v modelu: denik-druhy-prelet-atlantiku-2017
  "denik-2017-usek-gronsko": { src: "/img/denik-2017-usek-gronsko.jpg", width: 1600, height: 1200, alt: "Další úsek, ze kterého mrazí :-)" },
  // deník 2017 přelet; v modelu: denik-druhy-prelet-atlantiku-2017
  "denik-2017-gronsko-tankovani": { src: "/img/denik-2017-gronsko-tankovani.jpg", width: 1600, height: 1200, alt: "Tankování v Grónsku z nádrže, čerpadlo poháněné motorem ze sekačky." },
  // deník 2017 přelet; v modelu: denik-druhy-prelet-atlantiku-2017
  "denik-2017-gronsko-a330": { src: "/img/denik-2017-gronsko-a330.jpg", width: 1600, height: 1200, alt: "Pravidelná linka z Kodaně, létá 4x týdne vždy s tímto A330." },
  // deník 2017 přelet; v modelu: denik-druhy-prelet-atlantiku-2017
  "denik-2017-gronsko-scenerie": { src: "/img/denik-2017-gronsko-scenerie.jpg", width: 1600, height: 1200, alt: "V Grónsku jsou k vidění zajímavé přírodní scenérie. Většina oblastí je nedotčena člověkem." },
  // deník 2017 přelet; v modelu: denik-druhy-prelet-atlantiku-2017
  "denik-2017-wick-hangary": { src: "/img/denik-2017-wick-hangary.jpg", width: 1600, height: 1200, alt: "Letiště Wick (EGPC), druhoválečné hangáry pro bombardéry Lancaster. Ty malé budovy podél hangáru jsou márnice, kde se ukládaly oběti po bombardování." },
  // deník 2017 přelet; v modelu: denik-druhy-prelet-atlantiku-2017
  "denik-2017-ropne-plosiny": { src: "/img/denik-2017-ropne-plosiny.jpg", width: 1600, height: 1200, alt: "Ropné plošiny v Severním moři. Téměř každá má svůj heliport a všechny jsou zaznamenané v databázi Garmin G1000" },
  // deník 2017 přelet; v modelu: denik-druhy-prelet-atlantiku-2017
  "denik-2017-labe": { src: "/img/denik-2017-labe.jpg", width: 1600, height: 1200, alt: "Česká řeka Labe, zde mezi Hamburkem a Severním mořem, je výrazně mohutnější a umožňuje provoz největším plavidlům." },
  // deník 2017 přelet; v modelu: denik-druhy-prelet-atlantiku-2017
  "denik-2017-praha-hangar": { src: "/img/denik-2017-praha-hangar.jpg", width: 1600, height: 1200, alt: "Konečně v Praze v hangáru Euro Jetu. Po čtyřech dnech a více než 30 hodinách letu jsme bezpečně na zemi bez jakýchkoli škrábanců." },
  // Honza, malý portrét (výřez 540 x 720 vlevo nahoře); v modelu: balicek-florida-week, balicek-grand-tour, index
  "honza-portret": { src: "/img/honza-portret.jpg", width: 240, height: 320, alt: "Nad jezerem Lake Powell, Utah/Arizona, USA" },
} as const satisfies Record<string, Photo>;

/**
 * Sloučí sady fotek do jedné. Klíč, který už v dřívější sadě je, skončí
 * chybou (při buildu i při next dev): druhá fotka by první tiše přepsala.
 */
function mergePhotoSets<T extends readonly Record<string, Photo>[]>(...sets: T): UnionToIntersection<T[number]> {
  const merged: Record<string, Photo> = {};
  for (const set of sets) {
    for (const [name, photo] of Object.entries(set)) {
      if (name in merged) throw new Error(`Fotka „${name}“ je v src/data/photos*.ts dvakrát.`);
      merged[name] = photo;
    }
  }
  return merged as UnionToIntersection<T[number]>;
}

type UnionToIntersection<U> = (U extends unknown ? (arg: U) => void : never) extends (arg: infer I) => void
  ? I
  : never;

/** Všechny fotky webu: z modelu a z fotobanky po oblastech. */
export const photos = mergePhotoSets(MODEL_PHOTOS, homePhotos, tripPhotos, destinationPhotos, articlePhotos);

export type PhotoName = keyof typeof photos;
